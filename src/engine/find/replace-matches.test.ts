import { describe, expect, it } from 'vitest';
import type { Command } from '../commands/command';
import { inlineText } from '../model/inline';
import type { EditorState } from '../state/editor-state';
import { historyPlugin, undo, undoDepth } from '../state/history';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { findMatches } from './find-matches';
import type { FindMatch, SearchOptions, FindQuery } from './find-types';
import { replaceMatches } from './replace-matches';

const PLAIN: SearchOptions = { caseSensitive: false, wholeWord: false, regex: false };

const stateOf = (...markdown: string[]) =>
  buildState(markdown, { block: 0, offset: 0 }, { plugins: [historyPlugin()] });

const textOf = (state: EditorState) => state.doc.blocks.map((block) => inlineText(block.regions.text));

function matchesOf(state: EditorState, search: FindQuery): readonly FindMatch[] {
  const result = findMatches(state.doc, search.query, search);
  if ('error' in result) throw new Error(result.error);
  return result.matches;
}

function replaceAll(state: EditorState, query: string, replacement: string, options: Partial<SearchOptions> = {}) {
  const search = { ...PLAIN, ...options, query };
  return run(state, replaceMatches(search, matchesOf(state, search), replacement));
}

describe('replaceMatches', () => {
  it('replaces every match in one transaction, which one undo takes back', () => {
    const state = stateOf('cat and cat', 'a cat');
    const { ok, state: next } = replaceAll(state, 'cat', 'tiger');
    expect(ok).toBe(true);
    expect(markdownOf(next)).toEqual(['tiger and tiger', 'a tiger']);
    expect(undoDepth(next)).toBe(1);
    expect(markdownOf(run(next, undo).state)).toEqual(['cat and cat', 'a cat']);
  });

  it('gives the replacement the marks at the start of the match it replaces', () => {
    const { state } = replaceAll(stateOf('a **bo**ld and bold'), 'bold', 'brave');
    expect(markdownOf(state)).toEqual(['a **brave** and brave']);
  });

  it('expands $& and numbered groups in regex mode, as String.prototype.replace does', () => {
    const { state } = replaceAll(stateOf('2026-10-21 and 1999-01-02'), '(\\d+)-(\\d+)-(\\d+)', '$3/$2/$1 ($&)', {
      regex: true,
    });
    expect(markdownOf(state)).toEqual(['21/10/2026 (2026-10-21) and 02/01/1999 (1999-01-02)']);
  });

  it('keeps the replacement literal outside regex mode', () => {
    const { state } = replaceAll(stateOf('price'), 'price', '$& $1');
    expect(textOf(state)).toEqual(['$& $1']);
  });

  it('expands the groups of a whole word pattern, leaving the word it only contains', () => {
    const { state } = replaceAll(stateOf('one bone'), 'o(n)e', '[$1]', { regex: true, wholeWord: true });
    expect(textOf(state)).toEqual(['[n] bone']);
  });

  it('does nothing and returns false when every replacement equals its match', () => {
    const state = stateOf('Same same');
    let dispatched = false;
    const search = { ...PLAIN, query: 'same', caseSensitive: true };
    const command: Command = replaceMatches(search, matchesOf(state, search), 'same');
    expect(command(state, () => (dispatched = true))).toBe(false);
    expect(dispatched).toBe(false);
  });

  it('skips a match the document no longer holds', () => {
    const before = stateOf('cat cat');
    const search = { ...PLAIN, query: 'cat' };
    const stale = matchesOf(before, search);
    const edited = replaceAll(before, 'cat', 'dog').state;
    expect(run(edited, replaceMatches(search, stale, 'cow')).ok).toBe(false);
    expect(run(edited, replaceMatches(search, [{ block: 'gone', region: 'text', from: 0, to: 3 }], 'cow')).ok).toBe(
      false,
    );
  });

  it('replaces a single match as its own step of history', () => {
    const state = stateOf('cat cat');
    const search = { ...PLAIN, query: 'cat' };
    const [first, second] = matchesOf(state, search);
    const once = run(state, replaceMatches(search, [first], 'dog')).state;
    const twice = run(once, replaceMatches(search, [{ ...second }], 'dog')).state;
    expect(markdownOf(twice)).toEqual(['dog dog']);
    expect(undoDepth(twice)).toBe(2);
    expect(markdownOf(run(twice, undo).state)).toEqual(['dog cat']);
  });
});
