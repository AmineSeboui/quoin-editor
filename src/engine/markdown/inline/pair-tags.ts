import type { Mark } from '../../model/types';
import type { Item, TagItem } from './inline-items';

type OpenTag = { readonly item: TagItem; readonly mark: Mark };

function stackOf(openByName: Map<string, OpenTag[]>, name: string): OpenTag[] {
  const existing = openByName.get(name);
  if (existing) return existing;
  const stack: OpenTag[] = [];
  openByName.set(name, stack);
  return stack;
}

export function pairTags(items: readonly Item[]): void {
  const openByName = new Map<string, OpenTag[]>();
  for (const item of items) {
    if (item.kind !== 'tag') continue;
    const { close, name, mark } = item.tag;
    if (!close) {
      if (mark) stackOf(openByName, name).push({ item, mark });
      continue;
    }
    const opener = openByName.get(name)?.pop();
    if (!opener) continue;
    const range = { mark: opener.mark };
    opener.item.range = range;
    item.range = range;
  }
}
