import { describe, expect, it, vi } from 'vitest';
import { Transaction } from '../state/transaction';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { buildState, markdownOf, newIds, run } from '../test-support/build-state';
import { insertTextWithRules, type InputRule } from './input-rule';

const upper = (name: string, match: RegExp, extra: Partial<InputRule> = {}): InputRule => ({
  name,
  match,
  ...extra,
  handler: (state, found, range) =>
    new Transaction(state).step(replaceInlineStep(range.block, range.region, range.from, range.to, [{ kind: 'text', text: found[0].toUpperCase(), marks: [] }])),
});

const never = (name: string, match: RegExp, extra: Partial<InputRule> = {}): InputRule => ({ name, match, ...extra, handler: vi.fn(() => null) });

describe('insertTextWithRules', () => {
  it('inserts like insertText when no rule matches', () => {
    const state = buildState(['ab'], { block: 0, offset: 1 });
    const { tr, state: next } = run(state, insertTextWithRules('x', [upper('z', /z$/)]));
    expect(markdownOf(next)).toEqual(['axb']);
    expect(tr?.getMeta('inputRule')).toBeUndefined();
    expect(tr?.origin).toBe('input');
  });

  it('refuses an empty value and reports without dispatching on a dry run', () => {
    const state = buildState(['ab'], { block: 0, offset: 1 });
    expect(run(state, insertTextWithRules('', [])).ok).toBe(false);
    const dispatch = vi.fn();
    expect(insertTextWithRules('x', [])(state, undefined)).toBe(true);
    expect(insertTextWithRules('x', [])(state, dispatch)).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('merges the insertion and the rule into one transaction carrying the typed text', () => {
    const state = buildState(['ab'], { block: 0, offset: 2 });
    const { tr, state: next } = run(state, insertTextWithRules('c', [upper('abc', /abc$/)]));
    expect(markdownOf(next)).toEqual(['ABC']);
    expect(tr?.steps).toHaveLength(2);
    expect(tr?.getMeta('inputRule')).toEqual({ undoText: 'c' });
    expect(tr?.origin).toBe('input');
  });

  it('lets the first rule that returns a transaction win and tries the next after a null', () => {
    const skipped = never('skip', /c$/);
    const state = buildState(['ab'], { block: 0, offset: 2 });
    const first = upper('first', /bc$/);
    const second = upper('second', /abc$/);
    expect(markdownOf(run(state, insertTextWithRules('c', [skipped, first, second])).state)).toEqual(['aBC']);
    expect(skipped.handler).toHaveBeenCalledTimes(1);
  });

  it('gives the handler the matched range in the region and the id factory', () => {
    const seen: unknown[] = [];
    const spy: InputRule = {
      name: 'spy',
      match: /b+c$/,
      handler(_state, found, range, context) {
        seen.push([found[0], range, context?.newId()]);
        return null;
      },
    };
    const state = buildState(['abb'], { block: 0, offset: 3 });
    run(state, insertTextWithRules('c', [spy], { newId: newIds('k') }));
    expect(seen).toEqual([['bbc', { block: 'b0', region: 'text', from: 1, to: 4 }, 'k0']]);
  });

  it('tests the text before the caret only, with atoms as the object replacement character', () => {
    const seen: string[] = [];
    const spy: InputRule = {
      name: 'spy',
      match: /\S* $/,
      handler(_state, found) {
        seen.push(found[0]);
        return null;
      },
    };
    const state = buildState(['[@Ada](mention:1)y'], { block: 0, offset: 1 });
    run(state, insertTextWithRules(' ', [spy]));
    expect(seen).toEqual(['\uFFFC ']);
  });

  it('filters rules by block type and by kind', () => {
    const state = buildState(['## ab'], { block: 0, offset: 5 });
    const type = never('type', /b$/, { blockTypes: ['CALLOUT'] });
    const kind = never('kind', /b$/, { kinds: ['paragraph'] });
    const fits = never('fits', /b$/, { blockTypes: ['MARKDOWN'], kinds: ['heading', 'quote'] });
    run(state, insertTextWithRules('b', [type, kind, fits]));
    expect(type.handler).not.toHaveBeenCalled();
    expect(kind.handler).not.toHaveBeenCalled();
    expect(fits.handler).toHaveBeenCalledTimes(1);
  });

  it('skips kind filters for blocks that have no kind', () => {
    const callout = { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'a' } };
    const rule = never('kind', /b$/, { kinds: ['paragraph'] });
    run(buildState([callout], { block: 0, offset: 1 }), insertTextWithRules('b', [rule]));
    expect(rule.handler).not.toHaveBeenCalled();
  });

  it('never runs inside a code mark, but does right after one when typing stops being code', () => {
    const rule = never('any', /x$/);
    run(buildState(['`ab`'], { block: 0, offset: 2 }), insertTextWithRules('x', [rule]));
    expect(rule.handler).not.toHaveBeenCalled();
    run(buildState(['`ab`c'], { block: 0, offset: 3 }), insertTextWithRules('x', [rule]));
    expect(rule.handler).toHaveBeenCalledTimes(1);
  });

  it('runs against a paragraph created from a node selection', () => {
    const rule = never('any', /x$/);
    run(buildState([{ id: 'd', type: 'DIVIDER', data: {} }], { node: 0 }), insertTextWithRules('x', [rule], { newId: newIds() }));
    expect(rule.handler).toHaveBeenCalledTimes(1);
  });
});
