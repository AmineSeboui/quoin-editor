import type * as Y from 'yjs';
import { regionsOf } from '../doc-shape';
import type { Context } from './context';
import { idsOf, type Id } from './ids';
import { live, textOfUnit } from './live';
import type { KnownRecord } from './record';
import { visibleIndexOf, type Piece } from './text-edit';
import { formatAt } from './text-format';
import { isReadable, unitContent, units, type Unit } from './text-units';

function pieceAt(context: Context, id: Id): Piece | null {
  const text = textOfUnit(context.doc, id);
  if (text === null) return null;
  const list = units(text);
  const at = list.findIndex((unit) => unit.id[0] === id[0] && unit.id[1] === id[1]);
  const insert = at < 0 ? null : unitContent(list[at]);
  if (insert === null) return null;
  const { attributes } = formatAt(list, isReadable);
  return { insert, attributes: attributes[at] };
}

export function contentFor(context: Context, unit: Unit, rehomed: Id | null): Piece | null {
  const sources = [unit.id, ...(rehomed === null ? [] : [rehomed]), ...context.index.copiesOf(unit.id).map(({ copy }) => copy)];
  for (const source of sources) {
    const piece = pieceAt(context, live(context.doc, context.index, source) ?? source);
    if (piece !== null) return piece;
  }
  return null;
}

// Where an anchor's lineage leads nowhere, the characters still go somewhere rather than nowhere: after the live copy
// of the record's last character, or at the end of the document.
export function fallbackPlace(context: Context, record: KnownRecord): { text: Y.Text; index: number } | null {
  for (const copy of [...idsOf(record.to)].reverse()) {
    const found = live(context.doc, context.index, copy);
    const text = found === null ? null : textOfUnit(context.doc, found);
    if (found !== null && text !== null) return { text, index: visibleIndexOf(text, found) + 1 };
  }
  const blocks = context.blocks.toArray();
  for (let i = blocks.length - 1; i >= 0; i--) {
    const text = [...regionsOf(blocks[i]).values()][0];
    if (text !== undefined) return { text, index: text.length };
  }
  return null;
}
