import type { Pos } from '../../engine';

const onLine = (rect: DOMRect | null, y: number): boolean => rect === null || (rect.top <= y && y <= rect.bottom);

// A caret has no affinity in the model, so an offset where a soft wrap happens is drawn at the start of the next line
// once it is written back. The offset before it is the end of the intended line.
export function stayOnLine(pos: Pos, y: number, rectAt: (pos: Pos) => DOMRect | null): Pos {
  if (pos.offset === 0 || onLine(rectAt(pos), y)) return pos;
  const before = { ...pos, offset: pos.offset - 1 };
  return onLine(rectAt(before), y) ? before : pos;
}
