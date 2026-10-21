import { describe, expect, it } from 'vitest';
import {
  createPluginKey,
  getPluginState,
  replaceInlineStep,
  text,
  textSelection,
  Transaction,
  type Command,
  type EditorState,
} from '../../engine';
import { insertText } from '../../engine/commands/insert-text';
import { deleteBackward } from '../../engine/commands/delete-commands';
import { setSelection } from '../../engine/commands/selection-commands';
import { buildState, run } from '../../engine/test-support/build-state';
import { dismissSuggestion, suggestionPlugin, type SuggestionState } from './suggestion-plugin';

const key = createPluginKey<SuggestionState>('test-suggestion');
const plugins = [suggestionPlugin(key, { char: '/' })];
const start = (text: string) => buildState([{ paragraph: text }], { block: 0, offset: text.length }, { plugins });
const apply = (state: EditorState, ...commands: Command[]) =>
  commands.reduce((current, command) => run(current, command).state, state);
const suggestion = (state: EditorState) => getPluginState(state, key);
const caretAt = (offset: number) => setSelection(textSelection({ block: 'b0', region: 'text', offset }));
const insertAtStart = (value: string): Command => (state, dispatch) => {
  dispatch?.(new Transaction(state).step(replaceInlineStep('b0', 'text', 0, 0, [text(value)])));
  return true;
};

describe('suggestionPlugin', () => {
  it('tracks the trigger and its query as the text changes', () => {
    const state = apply(start('note '), insertText('/'), insertText('bu'));
    expect(suggestion(state)).toEqual({
      active: { block: 'b0', region: 'text', from: 5, to: 8, query: 'bu' },
      dismissedAt: null,
    });
  });

  it('keeps a dismissed trigger closed while its query grows or text arrives before it', () => {
    const dismissed = apply(start('/he'), dismissSuggestion(key));
    expect(suggestion(dismissed)).toEqual({ active: null, dismissedAt: { block: 'b0', region: 'text', from: 0, to: 3 } });
    const typed = apply(dismissed, insertText('a'), insertAtStart('x '));
    expect(suggestion(typed)).toEqual({ active: null, dismissedAt: { block: 'b0', region: 'text', from: 2, to: 6 } });
  });

  it('opens again once the trigger is deleted and typed anew', () => {
    const state = apply(start('/he'), dismissSuggestion(key), deleteBackward, deleteBackward, deleteBackward);
    expect(suggestion(state)).toEqual({ active: null, dismissedAt: null });
    expect(suggestion(apply(state, insertText('/'))).active).toMatchObject({ from: 0, query: '' });
  });

  it('opens again once the caret has left the trigger and come back', () => {
    const state = apply(start('a /he'), dismissSuggestion(key), caretAt(1));
    expect(suggestion(state)).toEqual({ active: null, dismissedAt: null });
    expect(suggestion(apply(state, caretAt(5))).active).toMatchObject({ from: 2, query: 'he' });
  });

  it('dismisses nothing when no trigger is open, and keeps its state when nothing it reads changes', () => {
    const state = start('plain');
    expect(dismissSuggestion(key)(state)).toBe(false);
    const open = start('/x');
    expect(suggestion(apply(open, caretAt(2)))).toBe(suggestion(open));
  });

  describe('beside other triggers', () => {
    const mention = createPluginKey<SuggestionState>('test-mention');
    const emoji = createPluginKey<SuggestionState>('test-emoji');
    const all = [
      suggestionPlugin(mention, { char: '@', allowSpaces: true }),
      suggestionPlugin(key, { char: '/' }),
      suggestionPlugin(emoji, { char: ':' }),
    ];
    const typed = (text: string) => buildState([{ paragraph: text }], { block: 0, offset: text.length }, { plugins: all });
    const actives = (state: EditorState) => [mention, key, emoji].map((each) => getPluginState(state, each).active?.query ?? null);

    it('leave only the one that starts nearest the caret active', () => {
      expect(actives(typed('Ask @Ada /x'))).toEqual([null, 'x', null]);
      expect(actives(typed('Ask @Ada :sm'))).toEqual([null, null, 'sm']);
      expect(actives(typed('/x @Ada'))).toEqual(['Ada', null, null]);
    });

    it('give the farther one back, undismissed, once the nearer one goes away', () => {
      const covered = apply(typed('Ask @Ada /x'), deleteBackward, deleteBackward);
      expect(actives(covered)).toEqual(['Ada ', null, null]);
      expect(getPluginState(covered, mention).dismissedAt).toBeNull();
    });

    it('keep a dismissed one dismissed while a nearer one comes and goes', () => {
      const dismissed = apply(typed('Ask @Ada'), dismissSuggestion(mention), insertText(' /x'));
      expect(actives(dismissed)).toEqual([null, 'x', null]);
      expect(actives(apply(dismissed, deleteBackward, deleteBackward))).toEqual([null, null, null]);
    });
  });
});
