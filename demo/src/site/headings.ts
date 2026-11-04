import { markdownBlocks } from './markdown-blocks';

export type Heading = { id: string; text: string; depth: number };

const HEADING = /^(#{1,6}) (.*)$/;

const plain = (markdown: string) =>
  markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();

/** Every heading of a markdown page, each carrying the id `markdownBlocks` gave its block, so a link to it lands. */
export function headingsOf(markdown: string): Heading[] {
  return markdownBlocks(markdown).flatMap((block) => {
    if (block.type !== 'MARKDOWN') return [];
    const match = HEADING.exec(String(block.data.markdown));
    return match ? [{ id: block.id, text: plain(match[2]), depth: match[1].length }] : [];
  });
}
