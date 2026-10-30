import { equalInline } from './inline';
import { sameValue } from './same-value';
import type { EngineBlock } from './types';

export function sameEngineBlock(a: EngineBlock, b: EngineBlock): boolean {
  if (a === b) return true;
  if (a.id !== b.id || a.type !== b.type || a.indent !== b.indent || !sameValue(a.attrs, b.attrs)) return false;
  const keys = Object.keys(a.regions);
  return (
    keys.length === Object.keys(b.regions).length &&
    keys.every((key) => key in b.regions && equalInline(a.regions[key], b.regions[key]))
  );
}
