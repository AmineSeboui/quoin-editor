import { fromMarkdown } from '../markdown/block/from-markdown';
import type { QuoinBlock } from '../model/quoin-block';

const NEEDS_PARSING = /[\r\n]|^(?:```|~~~|---|\*\*\*|___|\$\$|\||<details|<!-- quoin:)/;

export function splitLegacyBlock(block: QuoinBlock, baseIndent: number, newId: () => string): QuoinBlock[] | null {
  const { markdown, ...extras } = block.data;
  if (block.type !== 'MARKDOWN' || typeof markdown !== 'string' || !NEEDS_PARSING.test(markdown)) return null;
  let firstId = true;
  const pieces = fromMarkdown(markdown, {
    softBreak: 'newline',
    newId: () => {
      if (!firstId) return newId();
      firstId = false;
      return block.id;
    },
  });
  if (pieces.length === 0 || (pieces.length === 1 && pieces[0].type === 'MARKDOWN')) return null;
  return pieces.map((piece, index): QuoinBlock => {
    const data = index === 0 ? { ...extras, ...piece.data } : piece.data;
    const indent = baseIndent + (piece.indent ?? 0);
    return indent > 0 ? { ...piece, data, indent } : { ...piece, data };
  });
}
