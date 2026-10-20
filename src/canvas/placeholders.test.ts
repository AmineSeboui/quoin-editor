import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../engine';
import { buildState, type SelectionSpec } from '../engine/test-support/build-state';
import { englishLabels } from '../i18n/english-labels';
import { placeholderFor } from './placeholders';

type Entry = Parameters<typeof buildState>[0][number];

const callout = (body: string): QuoinBlock => ({ id: 'c', type: 'CALLOUT', data: { tone: 'info', body } });
const toggle = (markdown: string): QuoinBlock => ({ id: 't', type: 'TOGGLE', data: { markdown, open: true } });
const divider: QuoinBlock = { id: 'd', type: 'DIVIDER', data: {} };

function placeholderOf(blocks: readonly Entry[], index: number, selection: SelectionSpec | null = null) {
  const state = buildState(blocks, selection);
  return placeholderFor(state, state.doc.blocks[index], englishLabels);
}

describe('placeholderFor', () => {
  it.each([
    ['a heading', '# ', 'Heading 1'],
    ['a third level heading', '### ', 'Heading 3'],
    ['a bullet item', '- ', 'List'],
    ['a numbered item', '1. ', 'List'],
    ['a task', '- [ ] ', 'List'],
    ['a quote', '> ', 'Quote'],
  ])('names the kind of %s wherever the caret is', (_, markdown, expected) => {
    expect(placeholderOf([markdown, 'other'], 0)).toBe(expected);
    expect(placeholderOf([markdown, 'other'], 0, { block: 1, offset: 0 })).toBe(expected);
  });

  it('names an empty callout and an empty toggle after their types', () => {
    expect(placeholderOf([callout(''), 'other'], 0)).toBe('Callout');
    expect(placeholderOf([toggle(''), 'other'], 0)).toBe('Toggle');
  });

  const heads: [string, SelectionSpec, string | undefined][] = [
    ['holds the caret', { block: 0, offset: 0 }, "Type '/' for commands"],
    ['holds the head of a selection', { anchor: { block: 1, offset: 2 }, head: { block: 0, offset: 0 } }, "Type '/' for commands"],
    ['holds only the anchor of a selection', { anchor: { block: 0, offset: 0 }, head: { block: 1, offset: 2 } }, undefined],
    ['is away from the caret', { block: 1, offset: 0 }, undefined],
    ['is in a block range', { blocks: [0, 1] }, undefined],
  ];

  it.each(heads)('offers the slash menu in an empty paragraph only while it %s', (_, selection, expected) => {
    expect(placeholderOf(['', 'other'], 0, selection)).toBe(expected);
  });

  it('offers the slash menu in a paragraph that is the only block, wherever the caret is', () => {
    expect(placeholderOf([''], 0)).toBe("Type '/' for commands");
  });

  it('gives a block with text, and a block with no text to type, no placeholder', () => {
    expect(placeholderOf(['# Title'], 0)).toBeUndefined();
    expect(placeholderOf(['- item'], 0)).toBeUndefined();
    expect(placeholderOf([callout('Careful')], 0)).toBeUndefined();
    expect(placeholderOf([divider, 'other'], 0, { node: 0 })).toBeUndefined();
  });

  it('takes every word from the labels it is given', () => {
    const state = buildState(['## ', ''], { block: 1, offset: 0 });
    const labels = { ...englishLabels, placeholderHeading: (level: number) => `Titre ${level}`, placeholderEmpty: 'Tapez /' };
    expect(placeholderFor(state, state.doc.blocks[0], labels)).toBe('Titre 2');
    expect(placeholderFor(state, state.doc.blocks[1], labels)).toBe('Tapez /');
  });
});
