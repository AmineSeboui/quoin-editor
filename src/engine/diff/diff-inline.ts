import { equalNode, normalizeInline } from '../model/inline';
import type { Inline } from '../model/types';
import { diffSequences } from './myers';
import { tokenize } from './tokens';

export type InlineChange = { op: 'equal' | 'insert' | 'delete'; inline: Inline };

export function diffInline(a: Inline, b: Inline): InlineChange[] {
  return diffSequences(tokenize(a), tokenize(b), equalNode).map(({ op, items }) => ({
    op,
    inline: normalizeInline(items),
  }));
}
