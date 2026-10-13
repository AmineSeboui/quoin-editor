import { alignOrUndefined, paletteOrUndefined } from '../blocks/data-fields';
import type { BlockAttrs } from '../model/types';
import type { Attr } from './html-tag';

export const indentAttr = (excess: number): Attr => ['data-indent', excess > 0 ? String(excess) : undefined];

export function alignAttr(align: unknown): Attr {
  const value = alignOrUndefined(align);
  return ['style', value === undefined ? undefined : `text-align:${value}`];
}

export const colorAttrs = (attrs: BlockAttrs): Attr[] => [
  ['data-color', paletteOrUndefined(attrs.color)],
  ['data-bg', paletteOrUndefined(attrs.background)],
];
