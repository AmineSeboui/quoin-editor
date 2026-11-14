import { inflateSync } from 'node:zlib';
import { PdfLexer, PdfName, PdfRef, PdfString, type PdfDict, type PdfValue } from './parse-pdf';

export type PdfEntry = { readonly offset: number; readonly value: PdfValue; readonly data?: Uint8Array };

export type PdfFile = {
  readonly bytes: Uint8Array;
  readonly version: string;
  readonly trailer: PdfDict;
  readonly objects: ReadonlyMap<number, PdfEntry>;
  resolve(value: PdfValue | undefined): PdfValue | undefined;
  dict(value: PdfValue | undefined): PdfDict;
  stream(value: PdfValue | undefined): Uint8Array;
  reachable(): Set<number>;
  readonly pages: readonly PdfDict[];
};

const ascii = (bytes: Uint8Array) => String.fromCharCode(...bytes);

function xrefTable(bytes: Uint8Array, lexer: PdfLexer): Map<number, number> {
  lexer.expect('xref');
  const offsets = new Map<number, number>();
  for (;;) {
    const mark = lexer.at;
    const first = lexer.word();
    if (first === 'trailer') {
      lexer.at = mark;
      return offsets;
    }
    const count = Number(lexer.word());
    lexer.skipSpace();
    for (let index = 0; index < count; index++) {
      const line = ascii(bytes.subarray(lexer.at, lexer.at + 20));
      if (!/^\d{10} \d{5} [nf](?: \n|\r\n| \r)$/.test(line)) throw new Error(`a malformed xref entry ${JSON.stringify(line)}`);
      if (line[17] === 'n') offsets.set(Number(first) + index, Number(line.slice(0, 10)));
      lexer.at += 20;
    }
  }
}

function decode(dict: PdfDict, raw: Uint8Array): Uint8Array {
  const filter = dict.Filter;
  if (filter === undefined) return raw;
  if (filter instanceof PdfName && filter.name === 'FlateDecode') return new Uint8Array(inflateSync(raw));
  return raw;
}

/** Reads a PDF the way a strict reader does: through its cross-reference table, checking every offset it gives. */
export function readPdf(bytes: Uint8Array): PdfFile {
  const head = ascii(bytes.subarray(0, 8));
  if (!/^%PDF-\d\.\d$/.test(head)) throw new Error(`no PDF header: ${head}`);
  const tail = ascii(bytes.subarray(Math.max(0, bytes.length - 64)));
  const end = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(tail);
  if (!end) throw new Error('no startxref and %%EOF at the end');
  const lexer = new PdfLexer(bytes, Number(end[1]));
  const offsets = xrefTable(bytes, lexer);
  lexer.expect('trailer');
  const trailer = lexer.value() as PdfDict;
  const objects = new Map<number, PdfEntry>();
  const lengths: [number, PdfDict, number][] = [];
  for (const [id, offset] of offsets) {
    const reader = new PdfLexer(bytes, offset);
    if (reader.word() !== String(id) || reader.word() !== '0' || reader.word() !== 'obj') {
      throw new Error(`object ${id} is not at offset ${offset}`);
    }
    const value = reader.value();
    const mark = reader.at;
    if (reader.word() === 'stream') {
      if (bytes[reader.at] === 13) reader.at++;
      if (bytes[reader.at] !== 10) throw new Error(`object ${id}: no end of line after stream`);
      lengths.push([id, value as PdfDict, reader.at + 1]);
      objects.set(id, { offset, value });
    } else {
      reader.at = mark;
      reader.expect('endobj');
      objects.set(id, { offset, value });
    }
  }
  const resolve = (value: PdfValue | undefined): PdfValue | undefined => (value instanceof PdfRef ? objects.get(value.id)?.value : value);
  for (const [id, dict, start] of lengths) {
    const length = resolve(dict.Length);
    if (typeof length !== 'number') throw new Error(`object ${id}: no stream length`);
    const reader = new PdfLexer(bytes, start + length);
    reader.expect('endstream');
    reader.expect('endobj');
    objects.set(id, { ...objects.get(id)!, data: decode(dict, bytes.subarray(start, start + length)) });
  }
  const dict = (value: PdfValue | undefined) => resolve(value) as PdfDict;
  const stream = (value: PdfValue | undefined) => {
    if (!(value instanceof PdfRef) || !objects.get(value.id)?.data) throw new Error('no stream there');
    return objects.get(value.id)!.data!;
  };
  const reachable = () => {
    const seen = new Set<number>();
    const walk = (value: PdfValue | undefined): void => {
      if (value instanceof PdfRef) {
        if (seen.has(value.id)) return;
        seen.add(value.id);
        walk(objects.get(value.id)?.value);
      } else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object' && !(value instanceof PdfName) && !(value instanceof PdfString)) {
        Object.values(value).forEach(walk);
      }
    };
    walk(trailer);
    return seen;
  };
  const pages: PdfDict[] = [];
  const collect = (node: PdfDict) => {
    const type = node.Type as PdfName;
    if (type.name === 'Page') pages.push(node);
    else for (const kid of node.Kids as PdfValue[]) collect(dict(kid));
  };
  if (trailer.Root) collect(dict(dict(trailer.Root).Pages));
  return { bytes, version: head.slice(5), trailer, objects, resolve, dict, stream, reachable, pages };
}
