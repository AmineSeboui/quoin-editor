import * as Y from 'yjs';
import type { BlockAttrs, EngineBlock } from '../engine/model/types';
import { inlineOps } from './inline-codec';

// Y.Text.delete starts from a search marker without the formatting in force there, so it can take a mark's end that
// stands just before the deleted characters for one that changes nothing, and drop it; a delta walks from the start.
export const deleteText = (text: Y.Text, at: number, length: number): void =>
  text.applyDelta(at > 0 ? [{ retain: at }, { delete: length }] : [{ delete: length }]);

/** The embed before a region's characters, naming the region. */
export type RegionStart = { readonly r: string };

export const regionStart = (name: string): RegionStart => ({ r: name });

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !(value instanceof Y.AbstractType);

/** The region an embed starts, or null when it starts none. */
export const regionNameOf = (embed: unknown): string | null =>
  isPlainObject(embed) && typeof embed.r === 'string' && embed.atom === undefined ? embed.r : null;

export const isAtomEmbed = (embed: unknown): embed is { atom: string; attrs: Record<string, string> } =>
  isPlainObject(embed) && typeof embed.atom === 'string' && isPlainObject(embed.attrs);

export const definedEntries = (attrs: BlockAttrs) => Object.entries(attrs).filter(([, value]) => value !== undefined);

/** The attrs map of a block's marker, or null once one holding `attrs` is put in place of a value that is not a map. */
export function attrsMap(marker: Y.Map<unknown>, attrs: BlockAttrs): Y.Map<unknown> | null {
  const current = marker.get('attrs');
  if (current instanceof Y.Map) return current;
  marker.set('attrs', new Y.Map<unknown>(definedEntries(attrs)));
  return null;
}

/** The marker that starts a block: a map of its `id`, `type`, `indent` and `attrs`, the last a map of its own. */
export function markerOf(block: EngineBlock): Y.Map<unknown> {
  return new Y.Map<unknown>([
    ['id', block.id],
    ['type', block.type],
    ['indent', block.indent],
    ['attrs', new Y.Map<unknown>(definedEntries(block.attrs))],
  ]);
}

export type Marker = { id: string; type: string; indent: number; attrs: Y.Map<unknown> | null };

/** What a marker says of its block, or null when it names no block, having no id that is a string. */
export function readMarker(map: Y.Map<unknown>): Marker | null {
  const [id, type, indent, attrs] = ['id', 'type', 'indent', 'attrs'].map((key) => map.get(key));
  if (typeof id !== 'string') return null;
  return {
    id,
    type: typeof type === 'string' ? type : '',
    indent: typeof indent === 'number' ? indent : 0,
    attrs: attrs instanceof Y.Map ? attrs : null,
  };
}

type Insert = { insert: unknown; attributes: Record<string, unknown> };

function blockOps(block: EngineBlock, map: Y.Map<unknown>, open?: string): Insert[] {
  const ops: Insert[] = [{ insert: map, attributes: {} }];
  for (const [name, inline] of Object.entries(block.regions)) {
    ops.push({ insert: regionStart(name), attributes: {} });
    if (name === open) break;
    ops.push(...inlineOps(inline));
  }
  return ops;
}

// One delta for the whole write: each insertion with formatting walks the text from its start.
const writeOps = (text: Y.Text, at: number, ops: Insert[]) => text.applyDelta(at > 0 ? [{ retain: at }, ...ops] : ops);

/**
 * Writes `block` at `at` with the marker `map`, its regions in order. With `open`, it stops after the start of that
 * region, so the characters already in the text after `at` become that region's.
 */
export function writeBlock(text: Y.Text, at: number, block: EngineBlock, map: Y.Map<unknown>, open?: string): void {
  writeOps(text, at, blockOps(block, map, open));
}

/** Writes the blocks at `at`, in order, and returns their markers. */
export function writeBlocks(text: Y.Text, at: number, blocks: readonly EngineBlock[]): Y.Map<unknown>[] {
  const maps = blocks.map(markerOf);
  writeOps(text, at, blocks.flatMap((block, i) => blockOps(block, maps[i])));
  return maps;
}
