import type * as Y from 'yjs';
import { atom, nodeLength, normalizeInline, text } from '../engine/model/inline';
import type { Attrs, Inline, InlineNode } from '../engine/model/types';
import { attributesToMarks, marksToAttributes } from './marks-codec';

export type AtomEmbed = { atom: string; attrs: Attrs };
export type InsertOp = { insert: string | AtomEmbed; attributes?: Readonly<Record<string, unknown>> };

/** The inserts of a delta that writes `inline`, each with its marks as formatting attributes. */
export const inlineOps = (inline: Inline): { insert: string | AtomEmbed; attributes: Record<string, unknown> }[] =>
  inline.map((node) => ({
    insert: node.kind === 'text' ? node.text : { atom: node.type, attrs: node.attrs },
    attributes: marksToAttributes(node.marks),
  }));

// Attributes are always given, empty ones included: without them Yjs would carry over the marks on the left.
export function insertInline(target: Y.Text, at: number, inline: Inline): void {
  let offset = at;
  for (const node of inline) {
    const attributes = marksToAttributes(node.marks);
    if (node.kind === 'text') target.insert(offset, node.text, attributes);
    else target.insertEmbed(offset, { atom: node.type, attrs: node.attrs } satisfies AtomEmbed, attributes);
    offset += nodeLength(node);
  }
}

function nodeOf({ insert, attributes }: InsertOp): InlineNode {
  const marks = attributesToMarks(attributes);
  return typeof insert === 'string' ? text(insert, marks) : atom(insert.atom, insert.attrs, marks);
}

export const inlineOfOps = (ops: readonly InsertOp[]): Inline => normalizeInline(ops.map(nodeOf));

export const inlineOf = (source: Y.Text): Inline => inlineOfOps(source.toDelta() as InsertOp[]);
