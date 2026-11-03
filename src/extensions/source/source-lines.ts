import { toMarkdown, type QuoinBlock, type ToMarkdownOptions } from '../../engine';

/** The lines of the document's markdown a block is drawn on, both ends counted from zero and both inside the block. */
export type LineSpan = { readonly from: number; readonly to: number };

const lineCount = (text: string): number => text.split('\n').length - 1;

// The document ends with a newline, so the line a prefix ends on is the one its last character sits on.
const withoutTrailingNewlines = (text: string): string => text.replace(/\n+$/, '');

/**
 * Where a block lands in the markdown of the whole document, read from the length of the document's prefixes: the
 * markdown of the blocks before it is a prefix of the whole, so the lines it adds are the block's own, less the blank
 * lines that separate it from the block above. Blocks are not serialised one by one, because a list item reads the
 * items above it and so spells itself differently alone.
 */
export function blockLines(
  blocks: readonly QuoinBlock[],
  index: number,
  options?: ToMarkdownOptions,
): LineSpan | null {
  if (!Number.isInteger(index) || index < 0 || index >= blocks.length) return null;
  const before = withoutTrailingNewlines(toMarkdown(blocks.slice(0, index), options));
  const through = toMarkdown(blocks.slice(0, index + 1), options);
  const separator = /^\n*/.exec(through.slice(before.length))?.[0].length ?? 0;
  return { from: lineCount(before) + separator, to: lineCount(withoutTrailingNewlines(through)) };
}
