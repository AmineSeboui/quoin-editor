import { fromMarkdown } from '../markdown/block/from-markdown';
import type { QuoinBlock } from '../model/quoin-block';

// A line that starts with a letter and does not end in whitespace or a backslash reads the same with either parser.
const PLAIN_LINE = /^\p{L}(?:[^\r\n]*[^\s\\])?$/u;

export function splitLegacyBlock(block: QuoinBlock, baseIndent: number, newId: () => string): QuoinBlock[] | null {
  const { markdown, ...extras } = block.data;
  if (block.type !== 'MARKDOWN' || typeof markdown !== 'string' || PLAIN_LINE.test(markdown)) return null;
  let firstId = true;
  const parsed = fromMarkdown(markdown, {
    softBreak: 'newline',
    newId: () => {
      if (!firstId) return newId();
      firstId = false;
      return block.id;
    },
  });
  const blank = parsed.length === 0 && markdown.trim() === '' && markdown !== '';
  const pieces = blank ? [{ id: block.id, type: 'MARKDOWN', data: { markdown: '' } }] : parsed;
  if (pieces.length === 0) return null;
  if (pieces.length === 1 && pieces[0].type === 'MARKDOWN' && pieces[0].data.markdown === markdown) return null;
  return pieces.map((piece, index): QuoinBlock => {
    const data = index === 0 ? { ...extras, ...piece.data } : piece.data;
    const indent = baseIndent + (piece.indent ?? 0);
    return indent > 0 ? { ...piece, data, indent } : { ...piece, data };
  });
}
