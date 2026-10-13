import { inlineLength } from '../../model/inline';
import type { EngineBlock } from '../../model/types';
import type { LineKind } from '../line-kind';

const MAX_MARKER_NUMBER = 999_999_999;
const ITEM_KINDS: readonly string[] = ['bullet', 'ordered', 'task'];

export type Container = {
  readonly kind: 'item' | 'toggle';
  readonly indent: number;
  readonly prefix: string;
  readonly childPrefix: string;
};

export type Placement = {
  readonly block: EngineBlock;
  readonly line: LineKind | undefined;
  readonly prefix: string;
  readonly hang: number;
  readonly residual: number;
  readonly parent: Container | undefined;
  readonly container: Container | undefined;
  readonly closed: readonly Container[];
  readonly bare: boolean;
  readonly fragile: boolean;
};

export type ListContext = {
  place(block: EngineBlock): Placement;
  finish(): Container[];
};

const lineKindOf = (block: EngineBlock): LineKind | undefined =>
  block.type === 'MARKDOWN' ? ((block.attrs.kind as LineKind | undefined) ?? 'paragraph') : undefined;

function startOf(block: EngineBlock): number {
  const { start } = block.attrs;
  return typeof start === 'number' && Number.isInteger(start) && start >= 0 ? Math.min(start, MAX_MARKER_NUMBER) : 1;
}

function openedBy(block: EngineBlock, prefix: string, hang: number): Container | undefined {
  if (hang > 0) return { kind: 'item', indent: block.indent, prefix, childPrefix: prefix + ' '.repeat(hang) };
  if (block.type === 'TOGGLE') return { kind: 'toggle', indent: block.indent, prefix, childPrefix: prefix };
  return undefined;
}

// A block closes every open container that is not shallower than it and is written inside the ones that remain.
// The first item of an ordered run keeps its own number and the rest count up from it.
export function createListContext(): ListContext {
  const stack: Container[] = [];
  const runs = new Map<number, number>();

  function place(block: EngineBlock): Placement {
    const closed: Container[] = [];
    while (stack.length > 0 && stack[stack.length - 1].indent >= block.indent) closed.push(stack.pop() as Container);
    const parent = stack[stack.length - 1];
    const prefix = parent?.childPrefix ?? '';
    const line = lineKindOf(block);

    for (const indent of [...runs.keys()]) if (indent > block.indent) runs.delete(indent);
    let placed = block;
    let number = 1;
    if (line === 'ordered') {
      number = Math.min(runs.get(block.indent) ?? startOf(block), MAX_MARKER_NUMBER);
      runs.set(block.indent, number + 1);
      if (number !== block.attrs.start) placed = { ...block, attrs: { ...block.attrs, start: number } };
    } else {
      runs.delete(block.indent);
    }

    const isItem = line !== undefined && ITEM_KINDS.includes(line);
    const hang = isItem ? (line === 'ordered' ? String(number).length : 0) + 2 : 0;
    const container = openedBy(block, prefix, hang);
    const residual = block.indent - stack.length;
    if (container) stack.push(container);

    const bare = (line === 'bullet' || line === 'ordered') && inlineLength(block.regions.text ?? []) === 0;
    const fragile = isItem && (bare || (line === 'ordered' && number !== 1));
    return { block: placed, line, prefix, hang, residual, parent, container, closed, bare, fragile };
  }

  return { place, finish: () => stack.splice(0).reverse() };
}
