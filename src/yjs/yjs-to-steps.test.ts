import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { createDoc } from '../engine/model/doc';
import { text } from '../engine/model/inline';
import type { EngineBlock, EngineDoc } from '../engine/model/types';
import type { Step } from '../engine/transform/step';
import { markerOf, regionStart, writeBlocks } from './doc-shape';
import { readShared } from './read-shared';
import { layoutShape } from './test-support/layout-shape';
import { noRequiredRegions, type RequiredRegions } from './required-regions';
import { readRemote } from './yjs-to-steps';

const block = (id: string, value: string): EngineBlock => ({
  id,
  type: 'MARKDOWN',
  indent: 0,
  attrs: { kind: 'paragraph' },
  regions: { text: [text(value)] },
});

// Yjs reports what an event changed only while its observers run.
function observed(doc: EngineDoc, given: EngineDoc = doc, required: RequiredRegions = noRequiredRegions) {
  const shared = new Y.Doc().getText('quoin');
  writeBlocks(shared, 0, doc.blocks);
  const errors: Error[] = [];
  const mirror = { text: shared, layout: readShared(shared, required).layout, stale: false, required };
  const seen: Step[][] = [];
  const structural: boolean[] = [];
  let current = given;
  shared.observeDeep((events) => {
    const read = readRemote(mirror, events, current);
    if (read.failed) errors.push(read.failed);
    structural.push(read.structural);
    const { steps } = read;
    seen.push(steps);
    current = steps.reduce((changed, step) => step.apply(changed).doc, current);
  });
  const after = () => current;
  return { shared, seen, after, errors, mirror, structural };
}

const markers = (shared: Y.Text) =>
  (shared.toDelta() as { insert: unknown }[]).flatMap(({ insert }) => (insert instanceof Y.Map ? [insert] : []));

const REGIONS: RequiredRegions = (type) => (type === 'CODE' ? ['code'] : type === 'MARKDOWN' ? ['text'] : []);

const kinds = (seen: Step[][]) => seen.map((steps) => steps.map((step) => step.stepType));

describe('reading a change of the shared text as engine steps', () => {
  it('reads typing as a change of the text of one region', () => {
    const { shared, seen, after, structural } = observed(createDoc([block('a', 'one'), block('b', 'two')]));
    shared.insert(9, '!', {});
    expect(kinds(seen)).toEqual([['replaceInline']]);
    expect(structural).toEqual([false]);
    expect(after().blocks[1]).toEqual(block('b', 'tw!o'));
  });

  it('reads a block marker put inside a region as a split, and one taken out as a join', () => {
    const { shared, seen, after } = observed(createDoc([block('a', 'hello')]));
    shared.doc!.transact(() => {
      shared.insertEmbed(4, markerOf(block('n', '')), {});
      shared.insertEmbed(5, regionStart('text'), {});
    });
    expect(after().blocks).toEqual([block('a', 'he'), block('n', 'llo')]);
    shared.delete(4, 2);
    expect(kinds(seen)).toEqual([['splitBlock'], ['joinBlocks']]);
    expect(after().blocks).toEqual([block('a', 'hello')]);
  });

  it('reads any other change of the blocks as one replacement that keeps the blocks it leaves alone', () => {
    const doc = createDoc([block('a', 'one'), block('b', 'two'), block('c', 'six')]);
    const { shared, seen } = observed(doc);
    shared.delete(5, 5);
    expect(kinds(seen)).toEqual([['replaceDoc']]);
    const [[step]] = seen;
    const next = step.apply(doc).doc;
    expect(next.blocks.map((kept) => kept.id)).toEqual(['a', 'c']);
    expect(next.blocks[0]).toBe(doc.blocks[0]);
    expect(next.blocks[1]).toBe(doc.blocks[2]);
  });

  it('reads a change of a marker map as a change of the block', () => {
    const { shared, seen, after } = observed(createDoc([block('a', 'one')]));
    const marker = (shared.toDelta() as { insert: Y.Map<unknown> }[])[0].insert;
    marker.set('indent', 2);
    (marker.get('attrs') as Y.Map<unknown>).set('kind', 'quote');
    expect(kinds(seen)).toEqual([['setIndent'], ['setAttrs']]);
    expect(after().blocks[0]).toEqual({ ...block('a', 'one'), indent: 2, attrs: { kind: 'quote' } });
  });

  it('replaces the whole document when its steps do not fit the one it is given', () => {
    const stale = createDoc([block('a', '')]);
    const { shared, seen, after, errors } = observed(createDoc([block('a', 'one')]), stale);
    shared.insert(5, '!', {});
    expect(kinds(seen)).toEqual([['replaceDoc']]);
    expect(after().blocks).toEqual([block('a', 'one!')]);
    expect(errors).toEqual([expect.any(Error)]);
  });

  it('reads a change of the type of a block as a replacement of that block, read for its new type', () => {
    const doc = createDoc([block('a', 'one'), block('b', 'two')]);
    const { shared, seen, after, mirror, structural } = observed(doc, doc, REGIONS);
    markers(shared)[1].set('type', 'CODE');
    expect(kinds(seen)).toEqual([['replaceBlock']]);
    expect(structural).toEqual([true]);
    expect(after().blocks[0]).toBe(doc.blocks[0]);
    expect(after()).toEqual(readShared(shared, REGIONS).doc);
    expect(after().blocks[1].regions).toEqual({ code: [text('two')] });
    expect(layoutShape(mirror.layout)).toEqual(layoutShape(readShared(shared, REGIONS).layout));
  });

  it('reads a type change that takes out or puts in the regions of its block as a replacement of that block', () => {
    const doc = createDoc([block('a', 'one'), block('b', 'two'), block('c', 'six')]);
    const { shared, seen, after, mirror } = observed(doc, doc, REGIONS);
    shared.doc!.transact(() => {
      shared.delete(6, 4);
      markers(shared)[1].set('type', 'DIVIDER');
    });
    shared.doc!.transact(() => {
      shared.insertEmbed(6, regionStart('code'), {});
      shared.insert(7, 'let', {});
      markers(shared)[1].set('type', 'CODE');
    });
    expect(kinds(seen)).toEqual([['replaceBlock'], ['replaceBlock']]);
    expect(after()).toEqual(readShared(shared, REGIONS).doc);
    expect(after().blocks[1].regions).toEqual({ code: [text('let')] });
    expect(layoutShape(mirror.layout)).toEqual(layoutShape(readShared(shared, REGIONS).layout));
  });

  it('reads a type change with typing in another block as a replacement of each block it touched', () => {
    const doc = createDoc([block('a', 'one'), block('b', 'two'), block('c', 'six')]);
    const { shared, seen, after, mirror } = observed(doc, doc, REGIONS);
    shared.doc!.transact(() => {
      shared.insert(2, '!', {});
      markers(shared)[2].set('type', 'CODE');
    });
    expect(kinds(seen)).toEqual([['replaceInline', 'replaceBlock']]);
    expect(after().blocks[1]).toBe(doc.blocks[1]);
    expect(after()).toEqual(readShared(shared, REGIONS).doc);
    expect(layoutShape(mirror.layout)).toEqual(layoutShape(readShared(shared, REGIONS).layout));
  });

  it('reads a type change of a block whose characters sit elsewhere as one replacement of the document', () => {
    const doc = createDoc([block('a', 'one'), block('b', 'two')]);
    const { shared, seen, after } = observed(doc, doc, REGIONS);
    shared.delete(6, 1);
    markers(shared)[0].set('type', 'CODE');
    expect(kinds(seen)).toEqual([['replaceDoc'], ['replaceDoc']]);
    expect(after()).toEqual(readShared(shared, REGIONS).doc);
  });

  it('reads a change of the id of a marker as one replacement of the document', () => {
    const doc = createDoc([block('a', 'one'), block('b', 'two')]);
    const { shared, seen, after } = observed(doc);
    markers(shared)[1].set('id', 'z');
    expect(kinds(seen)).toEqual([['replaceDoc']]);
    expect(after()).toEqual(readShared(shared).doc);
  });
});
