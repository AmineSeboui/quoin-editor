import { JSDOM } from 'jsdom';
import { toDocx, type DocxOptions } from '../index';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import { textOf, unzip, type UnzippedEntry } from './unzip';

const { DOMParser } = new JSDOM().window;

/** The parse error of an XML document, or null when it is well-formed. */
export function xmlError(xml: string): string | null {
  const parsed = new DOMParser().parseFromString(xml, 'application/xml');
  return parsed.getElementsByTagName('parsererror')[0]?.textContent ?? null;
}

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');

const children = (element: Element, name: string) => [...element.children].filter((child) => child.tagName === name);
const child = (element: Element | undefined, name: string) => (element ? children(element, name)[0] : undefined);
const val = (element: Element | undefined) => element?.getAttribute('w:val') ?? undefined;

export type WordRun = { readonly text: string; readonly props: Readonly<Record<string, string>>; readonly link?: string };

export type WordParagraph = {
  readonly text: string;
  readonly style?: string;
  readonly numId?: string;
  readonly level?: string;
  readonly indent?: string;
  readonly align?: string;
  readonly shade?: string;
  readonly border?: boolean;
  readonly inTable: boolean;
  readonly bookmark?: string;
  readonly runs: WordRun[];
  readonly element: Element;
};

function runOf(run: Element, link: string | undefined): WordRun {
  const props: Record<string, string> = {};
  for (const prop of child(run, 'w:rPr')?.children ?? []) {
    props[prop.tagName.slice(2)] = prop.getAttribute('w:fill') ?? prop.getAttribute('w:val') ?? '';
  }
  const text = [...run.children].map((part) => (part.tagName === 'w:t' ? part.textContent : part.tagName === 'w:br' ? '\n' : '')).join('');
  return { text, props, link };
}

function paragraphOf(paragraph: Element, links: ReadonlyMap<string, string>): WordParagraph {
  const pPr = child(paragraph, 'w:pPr');
  const runs = [...paragraph.children].flatMap((part) => {
    if (part.tagName === 'w:r') return [runOf(part, undefined)];
    if (part.tagName !== 'w:hyperlink') return [];
    const link = part.getAttribute('w:anchor') ? `#${part.getAttribute('w:anchor')}` : links.get(part.getAttribute('r:id') ?? '');
    return children(part, 'w:r').map((run) => runOf(run, link));
  });
  return {
    text: runs.map(({ text }) => text).join(''),
    style: val(child(pPr, 'w:pStyle')),
    numId: val(child(child(pPr, 'w:numPr'), 'w:numId')),
    level: val(child(child(pPr, 'w:numPr'), 'w:ilvl')),
    indent: child(pPr, 'w:ind')?.getAttribute('w:left') ?? undefined,
    align: val(child(pPr, 'w:jc')),
    shade: child(pPr, 'w:shd')?.getAttribute('w:fill') ?? undefined,
    border: child(pPr, 'w:pBdr') !== undefined,
    inTable: paragraph.parentElement?.tagName === 'w:tc',
    bookmark: child(paragraph, 'w:bookmarkStart')?.getAttribute('w:name') ?? undefined,
    runs,
    element: paragraph,
  };
}

export type WordDocument = {
  readonly entries: Map<string, UnzippedEntry>;
  readonly blob: Blob;
  readonly xml: string;
  readonly body: Element;
  readonly paragraphs: WordParagraph[];
  readonly relationships: Element[];
  paragraph(text: string): WordParagraph;
  run(text: string): WordRun;
};

/** Exports blocks and reads the archive back: its parts, the paragraphs of its body and their runs. */
export async function exportDocument(blocks: readonly QuoinBlock[], options?: DocxOptions): Promise<WordDocument> {
  const blob = await toDocx(blocks, options);
  const entries = unzip(new Uint8Array(await blob.arrayBuffer()));
  const xml = textOf(entries, 'word/document.xml');
  const relationships = [...parse(textOf(entries, 'word/_rels/document.xml.rels')).getElementsByTagName('Relationship')];
  const links = new Map(relationships.map((rel) => [rel.getAttribute('Id') ?? '', rel.getAttribute('Target') ?? '']));
  const body = parse(xml).getElementsByTagName('w:body')[0];
  const paragraphs = [...body.getElementsByTagName('w:p')].map((paragraph) => paragraphOf(paragraph, links));
  const find = <T>(items: T[], test: (item: T) => boolean, what: string): T => {
    const found = items.find(test);
    if (!found) throw new Error(`no ${what} in ${JSON.stringify(paragraphs.map(({ text }) => text))}`);
    return found;
  };
  return {
    entries,
    blob,
    xml,
    body,
    paragraphs,
    relationships,
    paragraph: (text) => find(paragraphs, (paragraph) => paragraph.text === text, `paragraph ${text}`),
    run: (text) => find(paragraphs.flatMap(({ runs }) => runs), (run) => run.text === text, `run ${text}`),
  };
}
