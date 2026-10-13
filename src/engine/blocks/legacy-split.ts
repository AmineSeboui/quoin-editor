import { fromMarkdown } from '../markdown/block/from-markdown';
import type { QuoinBlock } from '../model/quoin-block';

// A line that starts with a letter and does not end in whitespace or a backslash reads the same with either parser.
const PLAIN_LINE = /^\p{L}(?:[^\r\n]*[^\s\\])?$/u;
const BLANK_PIECE: QuoinBlock = { id: '', type: 'MARKDOWN', data: { markdown: '' } };

const pieceId = (id: string, index: number) => (index === 0 ? id : `${id}-${index + 1}`);

function readPieces(markdown: string): QuoinBlock[] {
  const pieces = fromMarkdown(markdown, { softBreak: 'newline', newId: () => '' });
  return pieces.length === 0 && markdown !== '' && markdown.trim() === '' ? [BLANK_PIECE] : pieces;
}

export function splitLegacyBlock(block: QuoinBlock, baseIndent: number): QuoinBlock[] | null {
  const { markdown, ...extras } = block.data;
  if (block.type !== 'MARKDOWN' || typeof markdown !== 'string' || PLAIN_LINE.test(markdown)) return null;
  const pieces = readPieces(markdown);
  if (pieces.length === 0) return null;
  if (pieces.length === 1 && pieces[0].type === 'MARKDOWN' && pieces[0].data.markdown === markdown) return null;
  return pieces.map((piece, index): QuoinBlock => {
    const data = index === 0 ? { ...extras, ...piece.data } : piece.data;
    const indent = baseIndent + (piece.indent ?? 0);
    const id = pieceId(block.id, index);
    return indent > 0 ? { ...piece, id, data, indent } : { ...piece, id, data };
  });
}
