import * as Y from 'yjs';
import { createDoc } from '../engine/model/doc';
import type { EngineBlock, EngineDoc } from '../engine/model/types';
import { isAtomEmbed, readMarker, regionNameOf, type Marker } from './doc-shape';
import { inlineOfOps, type InsertOp } from './inline-codec';
import { createLayout, emptySpan, type Entry, type Layout, type Region, type Seg, type Span } from './layout';
import { noRequiredRegions, type RequiredRegions } from './required-regions';

type Op = { insert: unknown; attributes?: Record<string, unknown> };
type Stray = { host: Span; at: number; length: number; ops: InsertOp[]; after: Region | null };

function reader(required: RequiredRegions) {
  const spans = [emptySpan()];
  const entries = new Map<string, Entry>();
  const markers = new Map<Entry, Marker>();
  const order: Region[] = [];
  const held = new Map<Seg, InsertOp[]>();
  const strays: Stray[] = [];
  let span = spans[0];
  let entry: Entry | null = null;
  let open: Seg | null = null;
  let stray: Stray | null = null;
  let clean = true;

  const segFor = (region: Region, host: Span, at: number, ops: InsertOp[] = []): Seg => {
    const seg: Seg = { host, region, at, length: 0 };
    host.segs.push(seg);
    held.set(seg, ops);
    return seg;
  };
  const opened = (region: Region) => {
    const seg = segFor(region, span, span.length + 1);
    region.segs.push(seg);
    return seg;
  };

  function content(op: InsertOp, length: number): void {
    if (open !== null) {
      open.length += length;
      held.get(open)!.push(op);
    } else if (span.index === 0 || span.entry !== null) {
      clean = false;
      if (stray === null) {
        stray = { host: span, at: span.length, length: 0, ops: [], after: order[order.length - 1] ?? null };
        strays.push(stray);
      }
      stray.length += length;
      stray.ops.push(op);
    }
  }

  function marker(map: Y.Map<unknown>): void {
    span = emptySpan();
    span.index = spans.length;
    spans.push(span);
    [open, stray] = [null, null];
    const fields = readMarker(map);
    const kept = fields !== null && !entries.has(fields.id);
    entry = kept ? { id: fields.id, map, span, regions: [], copies: [] } : null;
    if (entry !== null) {
      span.entry = entry;
      entries.set(entry.id, entry);
      markers.set(entry, fields!);
    } else {
      clean = false;
      if (fields !== null) {
        span.copyOf = entries.get(fields.id)!;
        span.copyOf.copies.push(span);
      }
    }
  }

  function embed(value: unknown): void {
    const name = regionNameOf(value);
    stray = null;
    if (name !== null && entry !== null && !entry.regions.some((region) => region.name === name)) {
      const region: Region = { name, entry, segs: [] };
      entry.regions.push(region);
      order.push(region);
      open = opened(region);
      return;
    }
    clean = false;
    if (open !== null) open = opened(open.region);
  }

  return {
    read(op: Op): void {
      const { insert } = op;
      if (typeof insert === 'string' || isAtomEmbed(insert)) {
        const length = typeof insert === 'string' ? insert.length : 1;
        content(op as InsertOp, length);
        span.length += length;
        return;
      }
      if (insert instanceof Y.Map) marker(insert);
      else embed(insert);
      span.length += 1;
    },
    finish(): { doc: EngineDoc; layout: Layout } {
      const leading: Seg[] = [];
      const read: Seg[] = [];
      let unread = false;
      for (const { host, at, length, ops, after } of strays) {
        const region = after ?? order[0];
        unread ||= region === undefined;
        if (region === undefined) continue;
        const seg = segFor(region, host, at, ops);
        seg.length = length;
        read.push(seg);
        if (after === null) leading.push(seg);
        else region.segs.push(seg);
      }
      order[0]?.segs.unshift(...leading);
      const blocks = [...entries.values()].map((kept): EngineBlock => {
        const { type, indent, attrs } = markers.get(kept)!;
        for (const name of required(type)) {
          if (!kept.regions.some((region) => region.name === name)) kept.regions.push({ name, entry: kept, segs: [] });
        }
        const inline = (segs: readonly Seg[]) => inlineOfOps(segs.flatMap((seg) => held.get(seg)!));
        const regions = kept.regions.map(({ name, segs }) => [name, inline(segs)]);
        return { id: kept.id, type, indent, attrs: attrs?.toJSON() ?? {}, regions: Object.fromEntries(regions) };
      });
      const layout = createLayout(spans, entries, clean, { read, leading: new Set(leading), unread });
      return { doc: createDoc(blocks), layout };
    },
  };
}

/**
 * The document every client reads from the shared text, and where the text holds it. It is read the same way by every
 * client and never written back, so concurrent changes that leave the text out of shape are read, not repaired:
 * - a block starts at each marker; a later marker of an id already read, or one without an id, starts a stretch that
 *   is not read at all;
 * - a region start the block already has, or an embed that is neither a marker, a region start nor an atom, is
 *   skipped, and the region before it goes on after it;
 * - characters outside a region join the region before them in the text, or the first region of the document when
 *   no region comes before them, and are dropped when the document has no region;
 * - a marker's missing type reads as '', its missing indent as 0 and its missing attrs as none;
 * - a region `required` names for the block's type that the text does not hold reads as empty.
 */
export function readShared(
  text: Y.Text,
  required: RequiredRegions = noRequiredRegions,
): { doc: EngineDoc; layout: Layout } {
  const read = reader(required);
  for (const op of text.toDelta() as Op[]) read.read(op);
  return read.finish();
}
