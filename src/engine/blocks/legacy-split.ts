import { fromMarkdown } from '../markdown/block/from-markdown';
import type { QuoinBlock } from '../model/quoin-block';

// A line that starts with a letter and does not end in whitespace or a backslash reads the same with either parser.
const PLAIN_LINE = /^\p{L}(?:[^\r\n]*[^\s\\])?$/u;
// fromMarkdown has no block for whitespace alone, which a 0.4 block can hold, so it reads as one empty paragraph.
const BLANK_PIECE: QuoinBlock = { id: '', type: 'MARKDOWN', data: { markdown: '' } };

export function pieceIds(id: string, count: number, taken: ReadonlySet<string>): string[] {
  const ids = [id];
  for (let suffix = 2; ids.length < count; suffix++) {
    if (!taken.has(`${id}-${suffix}`)) ids.push(`${id}-${suffix}`);
  }
  return ids;
}

function readPieces(markdown: string): QuoinBlock[] {
  const pieces = fromMarkdown(markdown, { softBreak: 'newline', newId: () => '' });
  return pieces.length === 0 && markdown !== '' && markdown.trim() === '' ? [BLANK_PIECE] : pieces;
}

export function splitLegacyBlock(
  block: QuoinBlock,
  baseIndent: number,
  taken: ReadonlySet<string> = new Set(),
): QuoinBlock[] | null {
  const { markdown, ...extras } = block.data;
  if (block.type !== 'MARKDOWN' || typeof markdown !== 'string' || PLAIN_LINE.test(markdown)) return null;
  const pieces = readPieces(markdown);
  if (pieces.length === 0) return null;
  if (pieces.length === 1 && pieces[0].type === 'MARKDOWN' && pieces[0].data.markdown === markdown) return null;
  const ids = pieceIds(block.id, pieces.length, taken);
  return pieces.map((piece, index): QuoinBlock => {
    const data = index === 0 ? { ...extras, ...piece.data } : piece.data;
    const indent = baseIndent + (piece.indent ?? 0);
    const id = ids[index];
    return indent > 0 ? { ...piece, id, data, indent } : { ...piece, id, data };
  });
}
