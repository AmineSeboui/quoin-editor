import type { BlockCodec } from '../engine/blocks/codec';
import type { BlockChange } from '../engine/diff/block-change';
import { sameValue } from '../engine/model/same-value';

// A list of no values, such as a table's alignment of no column, says what leaving it out says.
const unset = (value: unknown) => value === undefined || (Array.isArray(value) && value.every((item) => item === null));
const sameAttr = (left: unknown, right: unknown) => sameValue(left, right) || (unset(left) && unset(right));

/** The names of what changed in a block besides its text: its attributes, and `type` or `indent`. */
export function changedAttributes({ before, after, attrsChanged }: BlockChange, codec: BlockCodec): string[] {
  if (!attrsChanged) return [];
  const [left] = codec.toEngineBlocks(before);
  const [right] = codec.toEngineBlocks(after);
  const names = [...new Set([...Object.keys(left.attrs), ...Object.keys(right.attrs)])].filter(
    (name) => !sameAttr(left.attrs[name], right.attrs[name]),
  );
  return [...(left.type === right.type ? [] : ['type']), ...(left.indent === right.indent ? [] : ['indent']), ...names];
}
