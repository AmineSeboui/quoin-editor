import type { Mark } from '../../model/types';
import type { Item, TagItem } from './inline-items';

type OpenTag = { readonly item: TagItem; readonly mark: Mark };

function lastWithName(open: readonly OpenTag[], name: string): number {
  let at = open.length - 1;
  while (at >= 0 && open[at].item.tag.name !== name) at--;
  return at;
}

export function pairTags(items: readonly Item[]): void {
  const open: OpenTag[] = [];
  for (const item of items) {
    if (item.kind !== 'tag') continue;
    const { close, name, mark } = item.tag;
    if (!close) {
      if (mark) open.push({ item, mark });
      continue;
    }
    const at = lastWithName(open, name);
    if (at < 0) continue;
    const [opener] = open.splice(at, 1);
    const range = { mark: opener.mark };
    opener.item.range = range;
    item.range = range;
  }
}
