import * as Y from 'yjs';
import type { YBlock } from '../doc-shape';
import type { Id } from './ids';

/** One clock of a `Y.Text`: a character, an embed or a formatting mark, deleted or not. */
export type Unit = {
  readonly id: Id;
  readonly item: Y.Item;
  readonly offset: number;
  readonly alive: boolean;
  readonly countable: boolean;
  readonly format: Y.ContentFormat | null;
};

export function units(text: Y.Text): Unit[] {
  const result: Unit[] = [];
  for (let item = text._start; item !== null; item = item.right) {
    const format = item.content instanceof Y.ContentFormat ? item.content : null;
    for (let offset = 0; offset < item.length; offset++) {
      const id: Id = [item.id.client, item.id.clock + offset];
      result.push({ id, item, offset, alive: !item.deleted, countable: item.countable, format });
    }
  }
  return result;
}

/** The ids of the characters a reader sees from `from` to `to`. */
export function visibleIds(text: Y.Text, from: number, to: number): Id[] {
  const ids: Id[] = [];
  let index = 0;
  for (const unit of units(text)) {
    if (!unit.alive || !unit.countable) continue;
    if (index >= from && index < to) ids.push(unit.id);
    index += 1;
  }
  return ids;
}

export function itemAt(doc: Y.Doc, [client, clock]: Id): Y.Item | null {
  if (clock >= Y.getState(doc.store, client)) return null;
  const item = Y.getItem(doc.store, Y.createID(client, clock));
  return item instanceof Y.Item ? item : null;
}

export function textById(doc: Y.Doc, id: Id): Y.Text | null {
  const content = itemAt(doc, id)?.content;
  return content instanceof Y.ContentType && content.type instanceof Y.Text ? content.type : null;
}

export const textId = (text: Y.Text): Id => [text._item!.id.client, text._item!.id.clock];

export const isAlive = (type: { readonly _item: Y.Item | null }) => type._item === null || !type._item.deleted;

export function blockOf(text: Y.Text): YBlock | null {
  const block = text.parent?.parent;
  return block instanceof Y.Map ? (block as YBlock) : null;
}

/** Whether Yjs still holds what a unit held: it is shown, or deleted and not collected yet. */
export const isReadable = ({ alive, item }: Unit) => alive || !(item.content instanceof Y.ContentDeleted);

/** What a unit holds for a reader: a character, an embed, or null once Yjs has collected it. */
export function unitContent({ item, offset }: Unit): string | object | null {
  if (item.content instanceof Y.ContentString) return item.content.str[offset] ?? null;
  if (item.content instanceof Y.ContentEmbed) return item.content.embed;
  return null;
}
