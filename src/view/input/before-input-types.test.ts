import { describe, expect, it } from 'vitest';
import { textSelection } from '../../engine/state/selection';
import { handleBeforeInput } from './before-input';
import { carrying, input, select, setup, targeting } from './before-input-support';

describe('insertText', () => {
  it('reads the text from dataTransfer when the browser sends no data', () => {
    const { controller, text } = setup('hi');
    const event = carrying(input('insertText'), '!');
    handleBeforeInput(controller, event);
    expect(event.defaultPrevented).toBe(true);
    expect(text()).toBe('hi!');
  });

  it('inserts nothing when there is neither data nor dataTransfer text', () => {
    const { controller, text } = setup('hi');
    handleBeforeInput(controller, input('insertText'));
    handleBeforeInput(controller, carrying(input('insertText'), ''));
    expect(text()).toBe('hi');
  });

  it('replaces the target range when it is not what the model has selected', () => {
    const { controller, host, text } = setup('hello world');
    handleBeforeInput(controller, targeting(carrying(input('insertText'), 'there'), host.firstChild!, 6, 11));
    expect(text()).toBe('hello there');
    handleBeforeInput(controller, targeting(input('insertText', 'J'), host.firstChild!, 0, 5));
    expect(text()).toBe('J there');
  });

  it('applies the transposed pair WebKit sends as insertText over the characters it selected', () => {
    const state = setup('Delta epsilon');
    select(state, 5, 7);
    handleBeforeInput(state.controller, targeting(carrying(input('insertText'), 'e '), state.host.firstChild!, 5, 7));
    expect(state.text()).toBe('Deltae psilon');
    expect(state.editor.state.selection).toEqual(textSelection({ block: 'a', region: 'text', offset: 7 }));
  });

  it('types over a selection that points backward when the target range is that selection', () => {
    const state = setup('hello world');
    select(state, 11, 6);
    handleBeforeInput(state.controller, targeting(input('insertText', 'x'), state.host.firstChild!, 6, 11));
    expect(state.text()).toBe('hello x');
  });

  it('keeps input rules for typed text and skips them for a replacement made through a target range', () => {
    const typed = setup('');
    handleBeforeInput(typed.controller, input('insertText', '#'));
    handleBeforeInput(typed.controller, input('insertText', ' '));
    expect(typed.editor.getBlocks()[0].data.markdown).toBe('# ');
    const replaced = setup('ab');
    handleBeforeInput(replaced.controller, targeting(input('insertText', '- '), replaced.host.firstChild!, 0, 2));
    expect(replaced.editor.getBlocks()[0].data.markdown).toBe('\\-&#32;');
  });
});

describe('deletes', () => {
  it('deletes forward one character, or the target range the browser sends', () => {
    const state = setup('one two three');
    const { controller, host, text } = state;
    select(state, 3);
    handleBeforeInput(controller, input('deleteContentForward'));
    expect(text()).toBe('onetwo three');
    handleBeforeInput(controller, targeting(input('deleteContentForward'), host.firstChild!, 3, 12));
    expect(text()).toBe('one');
  });

  it('deletes forward the range of a kill to the end of the line sent as deleteContentForward', () => {
    const state = setup('Delta epsilon');
    select(state, 6);
    handleBeforeInput(state.controller, targeting(input('deleteContentForward'), state.host.firstChild!, 6, 13));
    expect(state.text()).toBe('Delta ');
  });

  it('runs the command when the target is the selection, in either direction, without a selection step of its own', () => {
    for (const [anchor, head] of [[2, 5], [5, 2]]) {
      for (const inputType of ['deleteContentBackward', 'deleteContentForward']) {
        const state = setup('abcdefgh');
        select(state, anchor, head);
        const seen: (string | undefined)[] = [];
        state.editor.subscribe((_, tr) => void seen.push(tr?.origin));
        handleBeforeInput(state.controller, targeting(input(inputType), state.host.firstChild!, 2, 5));
        expect(state.text()).toBe('abfgh');
        expect(seen).toHaveLength(1);
      }
    }
  });

  it('deletes forward to the next block when there is no target range at the end of a block', () => {
    const state = setup('ab');
    state.editor.setBlocks([
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'ab' } },
      { id: 'b', type: 'MARKDOWN', data: { markdown: 'cd' } },
    ]);
    handleBeforeInput(state.controller, input('deleteContentForward'));
    expect(state.editor.getBlocks().map((block) => block.data.markdown)).toEqual(['abcd']);
  });

  it.each([
    ['deleteWordForward', 'one  three'],
    ['deleteSoftLineForward', 'one '],
    ['deleteHardLineForward', 'one '],
  ])('forward delete %s runs its engine command, or deletes the target range when there is one', (inputType, byCommand) => {
    const state = setup('one two three');
    select(state, 4);
    handleBeforeInput(state.controller, input(inputType));
    expect(state.text()).toBe(byCommand);
    const targeted = setup('one two three');
    select(targeted, 0);
    handleBeforeInput(targeted.controller, targeting(input(inputType), targeted.host.firstChild!, 4, 7));
    expect(targeted.text()).toBe('one  three');
  });

  it.each([
    ['deleteWordBackward', 'one  three'],
    ['deleteSoftLineBackward', ' three'],
    ['deleteHardLineBackward', ' three'],
  ])('backward delete %s runs its engine command, or deletes the target range when there is one', (inputType, byCommand) => {
    const state = setup('one two three');
    select(state, 7);
    handleBeforeInput(state.controller, input(inputType));
    expect(state.text()).toBe(byCommand);
    const targeted = setup('one two three');
    handleBeforeInput(targeted.controller, targeting(input(inputType), targeted.host.firstChild!, 4, 7));
    expect(targeted.text()).toBe('one  three');
  });
});

describe('formats, history and replacements', () => {
  it.each([
    ['formatItalic', '_ab_'],
    ['formatUnderline', '<u>ab</u>'],
    ['formatStrikeThrough', '~~ab~~'],
    ['formatBold', '**ab**'],
  ])('%s toggles its mark on the selection', (inputType, expected) => {
    const state = setup('ab');
    select(state, 0, 2);
    handleBeforeInput(state.controller, input(inputType));
    expect(state.editor.getBlocks()[0].data.markdown).toBe(expected);
    handleBeforeInput(state.controller, input(inputType));
    expect(state.editor.getBlocks()[0].data.markdown).toBe('ab');
  });

  it('redoes what historyUndo took back', () => {
    const state = setup('ab');
    select(state, 2);
    handleBeforeInput(state.controller, input('insertText', 'c'));
    handleBeforeInput(state.controller, input('historyUndo'));
    expect(state.text()).toBe('ab');
    handleBeforeInput(state.controller, input('historyRedo'));
    expect(state.text()).toBe('abc');
  });

  it('replaces from dataTransfer, then from data, over the target range, or at the caret without one', () => {
    const { controller, host, text } = setup('teh cat');
    handleBeforeInput(controller, targeting(carrying(input('insertReplacementText'), 'the'), host.firstChild!, 0, 3));
    expect(text()).toBe('the cat');
    handleBeforeInput(controller, targeting(input('insertReplacementText', 'dog'), host.firstChild!, 4, 7));
    expect(text()).toBe('the dog');
    handleBeforeInput(controller, carrying(input('insertReplacementText'), '!'));
    expect(text()).toBe('the dog!');
    handleBeforeInput(controller, input('insertReplacementText'));
    expect(text()).toBe('the dog!');
  });

  it('transposes the characters around the caret and does nothing over a range', () => {
    const state = setup('abc');
    select(state, 2);
    handleBeforeInput(state.controller, input('insertTranspose'));
    expect(state.text()).toBe('acb');
    select(state, 0, 3);
    handleBeforeInput(state.controller, input('insertTranspose'));
    expect(state.text()).toBe('acb');
  });
});
