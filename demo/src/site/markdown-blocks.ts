import { fromMarkdown, type QuoinBlock } from 'quoin-editor/engine';
import { headingAnchor } from './heading-anchor';

const HEADING = /^#{1,6} (.*)$/;

/**
 * The blocks of a markdown page, each heading's id its anchor, numbered when it repeats, so that `toHTML` gives the
 * heading the id `h-<anchor>` and a link to `#<anchor>` reaches it once the prefix is dropped.
 */
export function markdownBlocks(markdown: string): QuoinBlock[] {
  const used = new Map<string, number>();
  let next = 0;
  return fromMarkdown(markdown, { newId: () => `b${next++}` }).map((block) => {
    const heading = block.type === 'MARKDOWN' ? HEADING.exec(String(block.data.markdown)) : null;
    if (!heading) return block;
    const anchor = headingAnchor(heading[1]);
    const count = used.get(anchor) ?? 0;
    used.set(anchor, count + 1);
    return { ...block, id: count === 0 ? anchor : `${anchor}-${count}` };
  });
}
