import { crc32 } from './crc32';
import { deflateRaw } from './deflate';

export type ZipFile = { readonly path: string; readonly data: Uint8Array };

type Entry = {
  readonly name: Uint8Array;
  readonly crc: number;
  readonly size: number;
  readonly method: number;
  readonly body: Uint8Array;
};

const UTF8_NAMES = 0x800;
const DEFLATE = 8;
// 1980-01-01 00:00, the earliest time a zip can record, so the same files always give the same archive.
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

async function entryOf({ path, data }: ZipFile): Promise<Entry> {
  const deflated = await deflateRaw(data);
  const smaller = deflated !== null && deflated.length < data.length;
  return {
    name: new TextEncoder().encode(path),
    crc: crc32(data),
    size: data.length,
    method: smaller ? DEFLATE : 0,
    body: smaller ? deflated : data,
  };
}

function header(signature: number, entry: Entry, central: number | undefined): Uint8Array {
  const length = central === undefined ? 30 : 46;
  const bytes = new Uint8Array(length + entry.name.length);
  const view = new DataView(bytes.buffer);
  let at = 0;
  const u16 = (value: number) => (view.setUint16(at, value, true), (at += 2));
  const u32 = (value: number) => (view.setUint32(at, value, true), (at += 4));
  u32(signature);
  if (central !== undefined) u16(20);
  u16(20);
  u16(UTF8_NAMES);
  u16(entry.method);
  u16(0);
  u16(DOS_DATE);
  u32(entry.crc);
  u32(entry.body.length);
  u32(entry.size);
  u16(entry.name.length);
  u16(0);
  if (central !== undefined) {
    u16(0);
    u16(0);
    u16(0);
    u32(0);
    u32(central);
  }
  bytes.set(entry.name, length);
  return bytes;
}

function endOfDirectory(count: number, size: number, offset: number): Uint8Array {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, size, true);
  view.setUint32(16, offset, true);
  return bytes;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** A zip archive of `files` in order, each deflated where that makes it smaller and the runtime can, else stored. */
export async function zipArchive(files: readonly ZipFile[]): Promise<Uint8Array> {
  const entries = await Promise.all(files.map(entryOf));
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const head = header(0x04034b50, entry, undefined);
    central.push(header(0x02014b50, entry, offset));
    local.push(head, entry.body);
    offset += head.length + entry.body.length;
  }
  const directory = concat(central);
  return concat([...local, directory, endOfDirectory(entries.length, directory.length, offset)]);
}
