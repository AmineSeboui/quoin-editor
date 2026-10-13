import type { EngineDoc } from '../model/types';

const isClosedToggle = (type: string, open: unknown) => type === 'TOGGLE' && open !== true;

// The outermost closed toggle that hides the block before `index`, as the index of that toggle.
export function hidingToggle(doc: EngineDoc, index: number): number | null {
  if (index < 2) return null;
  let limit = doc.blocks[index - 1].indent;
  let hiding: number | null = null;
  for (let at = index - 2; at >= 0 && limit > 0; at--) {
    const { indent, type, attrs } = doc.blocks[at];
    if (indent >= limit) continue;
    limit = indent;
    if (isClosedToggle(type, attrs.open)) hiding = at;
  }
  return hiding;
}
