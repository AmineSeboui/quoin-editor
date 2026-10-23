import type { Inline, InlineNode, Mark } from '../engine/model/types';
import type { DocxContext } from './docx-context';
import { propsOf, runPropertiesXml, type RunProps } from './run-properties';
import { CODE_CHAR_STYLE } from './style-ids';
import { wordLink } from './word-link';
import { escapeXml, xmlElement } from './xml';

const pieceXml = (piece: string) => (piece === '' ? '' : xmlElement('w:t', { 'xml:space': 'preserve' }, escapeXml(piece)));

const lineXml = (line: string) => line.split('\t').map(pieceXml).join('<w:tab/>');

const textXml = (text: string) => text.split(/\r\n|\r|\n/).map(lineXml).join('<w:br/>');

/** One run of `text`, its line breaks and tabs written as breaks and tabs; nothing for no text. */
export const runXml = (text: string, props: RunProps = {}): string =>
  text === '' ? '' : xmlElement('w:r', {}, runPropertiesXml(props) + textXml(text));

function linkOf(marks: readonly Mark[]): string | null {
  const link = marks.find((mark) => mark.type === 'link');
  return link ? wordLink(link.attrs?.href ?? '') : null;
}

function nodeRun(node: InlineNode, ctx: DocxContext, base: RunProps, linked: boolean): string {
  const props = propsOf(node.marks, base, linked);
  if (node.kind === 'text') return runXml(node.text, props);
  const text = ctx.schema.atoms.get(node.type)?.plainText(node.attrs) ?? '';
  return runXml(text, node.type === 'math' ? { ...props, style: CODE_CHAR_STYLE } : props);
}

/** The runs of an inline region, those under one safe link gathered in a hyperlink to it. */
export function runsXml(inline: Inline | undefined, ctx: DocxContext, base: RunProps = {}): string {
  let out = '';
  let open: string | null = null;
  let runs = '';
  const flush = () => {
    out += open === null || runs === '' ? runs : xmlElement('w:hyperlink', { 'r:id': ctx.link(open) }, runs);
    runs = '';
  };
  for (const node of inline ?? []) {
    const href = linkOf(node.marks);
    if (href !== open) {
      flush();
      open = href;
    }
    runs += nodeRun(node, ctx, base, href !== null);
  }
  flush();
  return out;
}
