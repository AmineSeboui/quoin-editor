import { nestHeadings, type HeadingNode } from '../engine/render/heading-tree';
import type { Heading } from '../engine/render/headings';
import type { DocxContext } from './docx-context';
import { paragraphXml } from './paragraph-xml';
import { runXml } from './runs-xml';
import { xmlElement } from './xml';

const LEVEL_STEP = 360;

function entriesXml(nodes: readonly HeadingNode<Heading>[], depth: number, ctx: DocxContext, indent: number): string {
  return nodes
    .map(({ heading, children }) => {
      const anchor = ctx.bookmarks.get(heading.blockId) ?? '';
      const run = runXml(heading.text, { style: 'Hyperlink' });
      const link = xmlElement('w:hyperlink', { 'w:anchor': anchor, 'w:history': 1 }, run);
      return paragraphXml({ indent: indent + depth * LEVEL_STEP }, link) + entriesXml(children, depth + 1, ctx, indent);
    })
    .join('');
}

/** The table of contents: a paragraph per heading, nested as toHTML nests them, each linking to its heading. */
export const tocXml = (headings: readonly Heading[], ctx: DocxContext, indent: number): string =>
  entriesXml(nestHeadings(headings), 0, ctx, indent);
