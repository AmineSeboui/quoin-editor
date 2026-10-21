import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { createDoc } from '../engine/model/doc';
import { text } from '../engine/model/inline';
import type { EngineBlock, EngineDoc } from '../engine/model/types';
import { regionsOf, toYBlock, type YBlock } from './doc-shape';
import { stepsFromYjs } from './yjs-to-steps';

const block = (id: string, value: string): EngineBlock => ({
  id,
  type: 'MARKDOWN',
  indent: 0,
  attrs: { kind: 'paragraph' },
  regions: { text: [text(value)] },
});

// Yjs reports what an event changed only while its observers run.
function observed(blocks: readonly EngineBlock[], doc: EngineDoc) {
  const shared = new Y.Doc().getArray<YBlock>('quoin');
  shared.insert(0, blocks.map(toYBlock));
  const seen: ReturnType<typeof stepsFromYjs>[] = [];
  shared.observeDeep((events) => void seen.push(stepsFromYjs(events, shared, doc)));
  return { shared, seen };
}

describe('reading a change of the shared document as engine steps', () => {
  it('reports the later copy of a block held twice, and keeps the first', () => {
    const doc = createDoc([block('a', 'one'), block('b', 'two')]);
    const { shared, seen } = observed(doc.blocks, doc);
    shared.insert(0, [toYBlock(block('b', 'moved'))]);
    const [{ steps, copies }] = seen;
    const after = steps.reduce((current, step) => step.apply(current).doc, doc);
    expect(copies).toEqual([2]);
    expect(after.blocks).toEqual([block('b', 'moved'), block('a', 'one')]);
  });

  it('replaces the whole document when its steps do not fit the one it is given', () => {
    const stale = createDoc([block('a', '')]);
    const { shared, seen } = observed([block('a', 'one')], stale);
    regionsOf(shared.get(0)).get('text')!.insert(3, '!');
    const [{ steps }] = seen;
    expect(steps.map((step) => step.stepType)).toEqual(['replaceDoc']);
    expect(steps[0].apply(stale).doc.blocks).toEqual([block('a', 'one!')]);
  });
});
