import type { BlockCodec } from '../engine/blocks/codec';
import type { BlockChange } from '../engine/diff/block-change';
import type { BlockAttrs } from '../engine/model/types';
import { sameValue } from '../engine/model/same-value';

// A list of no values, such as a table's alignment of no column, says what leaving it out says.
const unset = (value: unknown) => value === undefined || (Array.isArray(value) && value.every((item) => item === null));
const sameAttr = (left: unknown, right: unknown) => sameValue(left, right) || (unset(left) && unset(right));

const changedIn = (left: BlockAttrs = {}, right: BlockAttrs = {}) =>
  Object.keys({ ...left, ...right }).filter((name) => !sameAttr(left[name], right[name]));

/**
 * The names of what changed in a block besides its text: its attributes, and `type` or `indent`. A block that holds
 * several nodes is compared piece by piece, a piece only one version has against no attributes.
 */
export function changedAttributes({ before, after }: BlockChange, codec: BlockCodec): string[] {
  const left = codec.toEngineBlocks(before);
  const right = codec.toEngineBlocks(after);
  const names = Array.from({ length: Math.max(left.length, right.length) }, (_, at) =>
    changedIn(left[at]?.attrs, right[at]?.attrs),
  );
  return [
    ...(left[0].type === right[0].type ? [] : ['type']),
    ...(left[0].indent === right[0].indent ? [] : ['indent']),
    ...new Set(names.flat()),
  ];
}
