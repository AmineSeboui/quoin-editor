import { inlineLength, inlineText, sliceInline } from '../model/inline';
import type { BlockAttrs, Inline } from '../model/types';

const BALLOT_BOX = /^([☐☑☒])\s*/;
const UNCHECKED = '☐';
const BOXABLE = new Set(['paragraph', 'bullet', 'ordered']);

/** A line that opens with a ballot box, as a checkbox of Word, Pages or a typed list writes it, read as a task. */
export function boxedTask(attrs: BlockAttrs, content: Inline): { attrs: BlockAttrs; content: Inline } {
  const box = BOXABLE.has(String(attrs.kind)) ? BALLOT_BOX.exec(inlineText(content)) : null;
  if (box === null) return { attrs, content };
  return {
    attrs: { kind: 'task', checked: box[1] !== UNCHECKED },
    content: sliceInline(content, box[0].length, inlineLength(content)),
  };
}
