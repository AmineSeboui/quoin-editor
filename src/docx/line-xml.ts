import type { EngineBlock } from '../engine/model/types';
import { headingLevel } from '../engine/render/headings';
import type { DocxContext } from './docx-context';
import { backgroundHex, textHex } from './palette-hex';
import { indentOf, paragraphXml, type ParagraphProps } from './paragraph-xml';
import { runsXml, runXml } from './runs-xml';
import { xmlElement } from './xml';

const CHECKBOX_HANG = 360;

function bookmarked(block: EngineBlock, ctx: DocxContext, runs: string): string {
  const name = ctx.bookmarks.get(block.id);
  if (name === undefined) return runs;
  const id = name.slice(2);
  return xmlElement('w:bookmarkStart', { 'w:id': id, 'w:name': name }) + runs + xmlElement('w:bookmarkEnd', { 'w:id': id });
}

/** A text block: a heading, a paragraph, a quote line, or a list item numbered by `numId`. */
export function lineXml(block: EngineBlock, ctx: DocxContext, numId?: number): string {
  const { attrs } = block;
  const runs = runsXml(block.regions.text, ctx, { color: textHex(attrs.color) });
  const props: ParagraphProps = { align: attrs.align, shade: backgroundHex(attrs.background), indent: indentOf(block.indent) };
  switch (attrs.kind) {
    case 'heading':
      return paragraphXml({ ...props, style: `Heading${headingLevel(block) ?? 1}` }, bookmarked(block, ctx, runs));
    case 'bullet':
    case 'ordered':
      return paragraphXml({ ...props, indent: undefined, numId, level: Math.min(block.indent, 8) }, runs);
    case 'task': {
      const box = attrs.checked === true ? '\u2611 ' : '\u2610 ';
      const hung = { ...props, indent: indentOf(block.indent) + CHECKBOX_HANG, hanging: CHECKBOX_HANG };
      return paragraphXml(hung, runXml(box) + runs);
    }
    case 'quote':
      return paragraphXml({ ...props, style: 'Quote' }, runs);
    default:
      return paragraphXml(props, runs);
  }
}
