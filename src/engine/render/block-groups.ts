import type { EngineBlock } from '../model/types';

export type ListKind = 'bullet' | 'ordered' | 'task';

export type Entry = {
  readonly block: EngineBlock;
  readonly excess: number;
  readonly children: Group[];
};

export type Group =
  | { readonly kind: 'single'; readonly entry: Entry }
  | { readonly kind: 'list'; readonly list: ListKind; readonly items: Entry[] }
  | { readonly kind: 'quote'; readonly items: Entry[] };

type Frame = { readonly owner: Entry; readonly depth: number };

const MAX_NESTING = 32;

export function listKind(block: EngineBlock): ListKind | undefined {
  const { kind } = block.attrs;
  if (block.type !== 'MARKDOWN') return undefined;
  return kind === 'bullet' || kind === 'ordered' || kind === 'task' ? kind : undefined;
}

const isQuote = (block: EngineBlock): boolean => block.type === 'MARKDOWN' && block.attrs.kind === 'quote';

function append(groups: Group[], entry: Entry): void {
  const last = groups[groups.length - 1];
  const list = listKind(entry.block);
  if (list) {
    if (last?.kind === 'list' && last.list === list) last.items.push(entry);
    else groups.push({ kind: 'list', list, items: [entry] });
  } else if (isQuote(entry.block)) {
    if (last?.kind === 'quote' && last.items[0].block.indent === entry.block.indent) last.items.push(entry);
    else groups.push({ kind: 'quote', items: [entry] });
  } else {
    groups.push({ kind: 'single', entry });
  }
}

// A list item or toggle owns the blocks that follow it with a deeper indent, which sit in a frame of their own.
// Frames stop opening past a fixed depth, so a document cannot nest deeper than the renderer can recurse.
// A block deeper than its frame expects keeps the difference as its excess.
export function groupBlocks(blocks: readonly EngineBlock[]): Group[] {
  const root: Group[] = [];
  const frames: Frame[] = [];
  for (const block of blocks) {
    while (frames.length > 0 && frames[frames.length - 1].owner.block.indent >= block.indent) frames.pop();
    const frame = frames[frames.length - 1];
    const entry: Entry = { block, excess: block.indent - (frame?.depth ?? 0), children: [] };
    append(frame?.owner.children ?? root, entry);
    if ((listKind(block) || block.type === 'TOGGLE') && frames.length < MAX_NESTING) {
      frames.push({ owner: entry, depth: block.indent + 1 });
    }
  }
  return root;
}
