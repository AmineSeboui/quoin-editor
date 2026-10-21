import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { createDoc } from '../engine/model/doc';
import { text } from '../engine/model/inline';
import type { EngineBlock, EngineDoc } from '../engine/model/types';
import type { Step } from '../engine/transform/step';
import { markerOf, regionStart, writeBlocks } from './doc-shape';
import { readShared } from './read-shared';
import { readRemote } from './yjs-to-steps';

const block = (id: string, value: string): EngineBlock => ({
  id,
  type: 'MARKDOWN',
  indent: 0,
  attrs: { kind: 'paragraph' },
  regions: { text: [text(value)] },
});

// Yjs reports what an event changed only while its observers run.
function observed(doc: EngineDoc, given: EngineDoc = doc) {
  const shared = new Y.Doc().getText('quoin');
  writeBlocks(shared, 0, doc.blocks);
  const mirror = { text: shared, layout: readShared(shared).layout, stale: false };
  const seen: Step[][] = [];
  let current = given;
  shared.observeDeep((events) => {
    const { steps } = readRemote(mirror, events, current);
    seen.push(steps);
    current = steps.reduce((changed, step) => step.apply(changed).doc, current);
  });
  const after = () => current;
  return { shared, seen, after };
}

const kinds = (seen: Step[][]) => seen.map((steps) => steps.map((step) => step.stepType));

describe('reading a change of the shared text as engine steps', () => {
  it('reads typing as a change of the text of one region', () => {
    const { shared, seen, after } = observed(createDoc([block('a', 'one'), block('b', 'two')]));
    shared.insert(9, '!', {});
    expect(kinds(seen)).toEqual([['replaceInline']]);
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
    const { shared, seen, after } = observed(createDoc([block('a', 'one')]), stale);
    shared.insert(5, '!', {});
    expect(kinds(seen)).toEqual([['replaceDoc']]);
    expect(after().blocks).toEqual([block('a', 'one!')]);
  });
});
