import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
import { text } from '../model/inline';
import type { EngineDoc } from '../model/types';
import { setAttrsStep, setIndentStep } from './attrs-steps';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep, replaceBlockStep } from './block-steps';
import { mapStep } from './map-step';
import { addMarkStep, removeMarkStep, restoreMarksStep } from './mark-steps';
import { replaceDocStep } from './replace-doc-step';
import { replaceInlineStep } from './replace-inline-step';
import { joinBlocksStep, splitBlockStep } from './split-join-steps';
import type { Step } from './step';
import { created, para } from './step-fixtures';

const before = createDoc([para('a', 'hello'), para('b', 'world'), para('c', '')]);

function mapped(step: Step, change: Step, doc: EngineDoc = before) {
  const { doc: after, map } = change.apply(doc);
  return mapStep(step, map, doc, after)?.toJSON() ?? null;
}

const typeX = (block: string, offset: number) => replaceInlineStep(block, 'text', offset, offset, [text('X')]);
const bold = { type: 'bold' };

describe('mapStep', () => {
  it('shifts an inline range after text inserted before it, and keeps it when the text went elsewhere', () => {
    expect(mapped(replaceInlineStep('a', 'text', 2, 4, []), typeX('a', 0))).toMatchObject({ from: 3, to: 5 });
    expect(mapped(replaceInlineStep('a', 'text', 2, 4, []), typeX('b', 0))).toMatchObject({ from: 2, to: 4 });
    expect(mapped(replaceInlineStep('a', 'text', 2, 2, [text('q')]), typeX('a', 2))).toMatchObject({ from: 3 });
  });

  it('keeps text inserted at either edge of a range out of it', () => {
    expect(mapped(replaceInlineStep('a', 'text', 2, 4, []), typeX('a', 2))).toMatchObject({ from: 3, to: 5 });
    expect(mapped(replaceInlineStep('a', 'text', 2, 4, []), typeX('a', 4))).toMatchObject({ from: 2, to: 4 });
  });

  it('gives null for a range whose text the change touched, or whose block is gone', () => {
    expect(mapped(replaceInlineStep('a', 'text', 1, 4, []), typeX('a', 2))).toBeNull();
    expect(mapped(replaceInlineStep('a', 'text', 1, 4, []), replaceInlineStep('a', 'text', 0, 2, []))).toBeNull();
    expect(mapped(replaceInlineStep('a', 'text', 1, 1, [text('q')]), removeBlocksStep(0, 1))).toBeNull();
  });

  it('follows a range into the block a split moved it to', () => {
    const split = splitBlockStep('a', 'text', 1, created('n'));
    expect(mapped(replaceInlineStep('a', 'text', 2, 4, []), split)).toMatchObject({ block: 'n', from: 1, to: 3 });
    expect(mapped(replaceInlineStep('a', 'text', 0, 4, []), split)).toBeNull();
  });

  it('follows a range into the block a join moved it to, and drops an insertion whose block is gone', () => {
    const join = joinBlocksStep('a', 'text', 'b', 'text');
    expect(mapped(replaceInlineStep('b', 'text', 1, 3, []), join)).toMatchObject({ block: 'a', from: 6, to: 8 });
    expect(mapped(replaceInlineStep('b', 'text', 1, 1, [text('q')]), join)).toBeNull();
    expect(mapped(replaceInlineStep('b', 'text', 1, 3, []), removeBlocksStep(1, 1))).toBeNull();
  });

  it('maps the range of mark steps the same way', () => {
    expect(mapped(addMarkStep('a', 'text', 1, 3, bold), typeX('a', 0))).toMatchObject({ from: 2, to: 4 });
    expect(mapped(removeMarkStep('a', 'text', 1, 3, 'bold'), typeX('a', 0))).toMatchObject({ from: 2, to: 4 });
    const restore = restoreMarksStep('a', 'text', 1, 3, [text('el', [bold])]);
    expect(mapped(restore, typeX('a', 0))).toMatchObject({ from: 2, to: 4, slice: [text('el', [bold])] });
    expect(mapped(restore, typeX('a', 2))).toBeNull();
  });

  it('keeps an attribute or indent step only while the change left that block attribute or indent alone', () => {
    const attrs = setAttrsStep('a', { kind: 'h1' });
    expect(mapped(attrs, typeX('a', 0))).toEqual(attrs.toJSON());
    expect(mapped(attrs, setAttrsStep('a', { open: true }))).toBeNull();
    expect(mapped(attrs, setIndentStep('a', 1))).toEqual(attrs.toJSON());
    expect(mapped(setIndentStep('a', 2), setIndentStep('a', 1))).toBeNull();
    expect(mapped(setIndentStep('a', 2), setAttrsStep('a', { open: true }))).toMatchObject({ indent: 2 });
  });

  it('keeps steps that address a block by id when the change left their part of it alone', () => {
    const steps = [setAttrsStep('a', { kind: 'h1', gone: undefined }), joinBlocksStep('a', 'text', 'b', 'text')];
    for (const step of steps) {
      expect(mapped(step, typeX('a', 0))).toEqual(step.toJSON());
    }
  });

  it('maps the offset of a split, and gives null when its block is gone', () => {
    expect(mapped(splitBlockStep('a', 'text', 2, created('n')), typeX('a', 0))).toMatchObject({ offset: 3 });
    expect(mapped(splitBlockStep('a', 'text', 2, created('n')), removeBlocksStep(0, 1))).toBeNull();
  });

  it('keeps a block replacement only while the change left that block alone', () => {
    const replace = replaceBlockStep(para('a', 'bye'));
    expect(mapped(replace, typeX('b', 0))).toEqual(replace.toJSON());
    expect(mapped(replace, typeX('a', 0))).toBeNull();
  });

  it('gives null for a whole document replacement', () => {
    expect(mapped(replaceDocStep(createDoc([para('z', '')])), typeX('b', 0))).toBeNull();
  });

  it('places inserted blocks after the block they followed', () => {
    const inserted = insertBlocksStep(1, [para('n', 'new')]);
    expect(mapped(inserted, insertBlocksStep(0, [para('m', '')]))).toMatchObject({ index: 2 });
    expect(mapped(inserted, removeBlocksStep(0, 1))).toBeNull();
    const first = insertBlocksStep(0, [para('n', '')]);
    expect(mapped(first, insertBlocksStep(0, [para('m', '')]))).toMatchObject({ index: 0 });
  });

  it('removes the same blocks wherever they went, and gives null once the change edited them', () => {
    expect(mapped(removeBlocksStep(1, 2), insertBlocksStep(0, [para('m', '')]))).toMatchObject({ index: 2, count: 2 });
    expect(mapped(removeBlocksStep(1, 2), typeX('b', 0))).toBeNull();
    expect(mapped(removeBlocksStep(1, 1), removeBlocksStep(1, 1))).toBeNull();
  });

  it('moves the same blocks to the same neighbour', () => {
    const move = moveBlocksStep(2, 1, 0);
    expect(mapped(move, insertBlocksStep(1, [para('m', '')]))).toMatchObject({ from: 3, to: 0 });
    expect(mapped(moveBlocksStep(0, 1, 2), insertBlocksStep(1, [para('m', '')]))).toMatchObject({ from: 0, to: 3 });
    expect(mapped(moveBlocksStep(0, 1, 2), removeBlocksStep(2, 1))).toBeNull();
  });
});
