import { sliceInline } from '../model/inline';
import { hasMark } from '../model/marks';
import type { Inline } from '../model/types';

export function touchesMark(inline: Inline, from: number, to: number, type: string): boolean {
  return sliceInline(inline, from, to).some((node) => hasMark(node.marks, type));
}
