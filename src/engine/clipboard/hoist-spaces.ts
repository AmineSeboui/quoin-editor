import { sameMark } from '../model/marks';
import type { Mark } from '../model/types';

export type Piece = { text: string; marks: readonly Mark[] };

const shared = (a: readonly Mark[], b: readonly Mark[]): readonly Mark[] =>
  a.filter((mark) => b.some((other) => sameMark(mark, other)));

// A space between two differently marked runs is given only the marks both share, so `**c **d` stays `**c** d`.
export function hoistEdgeSpaces(pieces: readonly Piece[]): Piece[] {
  const result: Piece[] = [];
  pieces.forEach((piece, at) => {
    const before = pieces[at - 1];
    const after = pieces[at + 1];
    if (piece.text === ' ' && before !== undefined && after !== undefined) {
      result.push({ text: ' ', marks: shared(before.marks, after.marks) });
      return;
    }
    const leading = before !== undefined && piece.text.length > 1 && piece.text.startsWith(' ');
    const trailing = after !== undefined && piece.text.length > 1 && piece.text.endsWith(' ');
    if (leading) result.push({ text: ' ', marks: shared(before.marks, piece.marks) });
    result.push({ ...piece, text: piece.text.slice(leading ? 1 : 0, trailing ? -1 : undefined) });
    if (trailing) result.push({ text: ' ', marks: shared(piece.marks, after.marks) });
  });
  return result;
}
