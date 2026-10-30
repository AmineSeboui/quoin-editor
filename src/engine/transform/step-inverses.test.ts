import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
import { atom, text } from '../model/inline';
import type { EngineBlock, EngineDoc } from '../model/types';
import { setAttrsStep, setIndentStep } from './attrs-steps';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep, replaceBlockStep } from './block-steps';
import { addMarkStep, removeMarkStep } from './mark-steps';
import { replaceInlineStep } from './replace-inline-step';
import { joinBlocksStep, splitBlockStep } from './split-join-steps';
import type { Step } from './step';
import { created, divider, para } from './step-fixtures';

const bold = { type: 'bold' };
const mixed = para('a', '', {
  regions: { text: [text('he', [bold]), text('llo wor'), atom('mention', { id: '1' }), text('ld', [bold])] },
});
const doc = createDoc([mixed, para('b', 'tail'), divider('d')]);

function undoes(step: Step, before: EngineDoc = doc): void {
  const { doc: after } = step.apply(before);
  expect(step.invert(before).apply(after).doc).toEqual(before);
}

describe('step inverses', () => {
  it('restores the marks of replaced content', () => {
    undoes(replaceInlineStep('a', 'text', 1, 12, [text('X')]));
    undoes(replaceInlineStep('a', 'text', 0, 0, [text('new', [bold])]));
  });

  it('restores marks that were added or removed', () => {
    undoes(addMarkStep('a', 'text', 1, 11, { type: 'italic' }));
    undoes(addMarkStep('a', 'text', 0, 4, bold));
    undoes(removeMarkStep('a', 'text', 0, 12, bold));
    undoes(removeMarkStep('a', 'text', 0, 12, 'bold'));
  });

  it('inverts a mark step to one that keeps every position where it was', () => {
    const steps = [addMarkStep('a', 'text', 1, 11, { type: 'italic' }), removeMarkStep('a', 'text', 0, 12, bold)];
    for (const step of steps) {
      const { doc: after } = step.apply(doc);
      const { map } = step.invert(doc).apply(after);
      for (const offset of [0, 1, 6, 8, 11, 12, 13]) {
        for (const assoc of [-1, 1] as const) {
          expect(map({ block: 'a', region: 'text', offset }, assoc).offset).toBe(offset);
        }
      }
    }
  });

  it('restores previous attrs and deletes the keys that were added', () => {
    const patch = setAttrsStep('a', { kind: 'heading', level: 3, extra: undefined });
    undoes(patch);
    expect(patch.invert(doc).toJSON()).toEqual({
      stepType: 'setAttrs',
      block: 'a',
      patch: { kind: 'paragraph', level: { $delete: true }, extra: { $delete: true } },
    });
    undoes(setIndentStep('b', 2));
  });

  it('turns an insert into a removal and a removal into an insert', () => {
    const insert = insertBlocksStep(1, [para('n', 'new')]);
    expect(insert.invert(doc).toJSON()).toEqual({ stepType: 'removeBlocks', index: 1, count: 1 });
    undoes(insert);
    const removal = removeBlocksStep(0, 2);
    expect(removal.invert(doc).toJSON()).toEqual({
      stepType: 'insertBlocks',
      index: 0,
      blocks: doc.blocks.slice(0, 2),
    });
    undoes(removal);
  });

  it('moves blocks back to where they were', () => {
    undoes(moveBlocksStep(0, 2, 1));
    undoes(moveBlocksStep(2, 1, 0));
  });

  it('restores a replaced block', () => {
    undoes(replaceBlockStep(divider('b')));
  });

  it('inverts a split to a join and back', () => {
    const extra = { region: 'body', indent: 1, regions: { note: [text('n')] } };
    const split = splitBlockStep('a', 'text', 5, created('c', extra));
    undoes(split);
    expect(split.invert(doc).toJSON()).toEqual({
      stepType: 'joinBlocks',
      target: 'a',
      targetRegion: 'text',
      source: 'c',
      sourceRegion: 'body',
    });
  });

  it('recreates the joined block with its type, attrs, indent and other regions', () => {
    const source: EngineBlock = {
      id: 'k',
      type: 'CALLOUT',
      indent: 1,
      attrs: { tone: 'warning', icon: '!' },
      regions: { body: [text('cd', [bold])], note: [text('memo')] },
    };
    const joinable = createDoc([para('a', 'ab'), source, divider('d')]);
    const join = joinBlocksStep('a', 'text', 'k', 'body');
    undoes(join, joinable);
    expect(join.invert(joinable).toJSON()).toMatchObject({
      stepType: 'splitBlock',
      block: 'a',
      region: 'text',
      offset: 2,
      created: {
        id: 'k',
        type: 'CALLOUT',
        indent: 1,
        attrs: source.attrs,
        region: 'body',
        regions: { note: source.regions.note },
      },
    });
  });

  it('restores the order of the regions of a joined block', () => {
    const source: EngineBlock = {
      id: 'k',
      type: 'CALLOUT',
      indent: 0,
      attrs: { tone: 'info' },
      regions: { body: [text('cd')], note: [text('memo')] },
    };
    const joinable = createDoc([para('a', 'ab'), source]);
    for (const region of ['body', 'note']) {
      const join = joinBlocksStep('a', 'text', 'k', region);
      const restored = join.invert(joinable).apply(join.apply(joinable).doc).doc;
      expect(Object.keys(restored.blocks[1].regions)).toEqual(['body', 'note']);
      expect(JSON.stringify(restored.blocks)).toBe(JSON.stringify(joinable.blocks));
    }
  });

  it('merges marked text across the join point and splits it back', () => {
    const pair = createDoc([
      para('a', '', { regions: { text: [text('ab', [bold])] } }),
      para('b', '', { regions: { text: [text('cd', [bold])] } }),
    ]);
    const join = joinBlocksStep('a', 'text', 'b', 'text');
    expect(join.apply(pair).doc.blocks[0].regions.text).toEqual([text('abcd', [bold])]);
    undoes(join, pair);
  });
});
