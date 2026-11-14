import type { EngineBlock } from '../../engine/model/types';
import type { Entry, Group, ListKind } from '../../engine/render/block-groups';
import { headingLevel } from '../../engine/render/headings';
import { RULE } from '../text/text-style';
import { blockBoxes } from './block-boxes';
import type { Box, Frame } from './box';
import { indented, type LayoutContext } from './layout-context';
import type { ListMarker } from './list-markers';

const QUOTE_BAR = 3;

function spaceBefore(block: EngineBlock): number {
  const level = headingLevel(block);
  return level === null ? 0 : level <= 2 ? 14 : 10;
}

const spaceAfter = (block: EngineBlock, listed: boolean) => (listed ? 3 : block.type === 'MARKDOWN' ? 6 : 8);

const gap = (height: number, frames: readonly Frame[]): Box[] => (height > 0 ? [{ height, gap: true, frames }] : []);

function markerOf(list: ListKind, block: EngineBlock, value: number): ListMarker {
  if (list === 'task') return { kind: 'task', checked: block.attrs.checked === true };
  return list === 'ordered' ? { kind: 'number', value, level: block.indent } : { kind: 'bullet', level: block.indent };
}

function entryBoxes({ block, children }: Entry, ctx: LayoutContext, frames: readonly Frame[], marker?: ListMarker): Box[] {
  return [
    ...gap(spaceBefore(block), frames),
    ...blockBoxes(block, ctx, frames, marker),
    ...gap(spaceAfter(block, marker !== undefined), frames),
    ...groupsBoxes(children, ctx, frames),
  ];
}

function groupBoxes(group: Group, ctx: LayoutContext, frames: readonly Frame[]): Box[] {
  if (group.kind === 'single') return entryBoxes(group.entry, ctx, frames);
  if (group.kind === 'quote') {
    const area = indented(ctx, group.items[0].block.indent);
    const quoted = [...frames, { x: area.x, width: area.width, bar: { width: QUOTE_BAR, color: RULE } }];
    return group.items.flatMap((entry) => entryBoxes(entry, ctx, quoted));
  }
  const start = group.items[0].block.attrs.start;
  const first = Number.isInteger(start) ? Number(start) : 1;
  return group.items.flatMap((entry, at) => entryBoxes(entry, ctx, frames, markerOf(group.list, entry.block, first + at)));
}

/** The boxes of the grouped blocks, in reading order, with the space between blocks as gaps. */
export const groupsBoxes = (groups: readonly Group[], ctx: LayoutContext, frames: readonly Frame[] = []): Box[] =>
  groups.flatMap((group) => groupBoxes(group, ctx, frames));
