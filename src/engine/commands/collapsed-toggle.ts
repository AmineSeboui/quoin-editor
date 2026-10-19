import type { EngineBlock, EngineDoc } from '../model/types';

export const isClosedToggle = ({ type, attrs }: EngineBlock) => type === 'TOGGLE' && attrs.open !== true;

// The outermost closed toggle that hides the block before `index`, as the index of that toggle.
export function hidingToggle(doc: EngineDoc, index: number, isClosed = isClosedToggle): number | null {
  if (index < 2) return null;
  let limit = doc.blocks[index - 1].indent;
  let hiding: number | null = null;
  for (let at = index - 2; at >= 0 && limit > 0; at--) {
    const { indent } = doc.blocks[at];
    if (indent >= limit) continue;
    limit = indent;
    if (isClosed(doc.blocks[at])) hiding = at;
  }
  return hiding;
}
