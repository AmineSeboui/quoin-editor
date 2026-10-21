import { describe, expect, it } from 'vitest';
import type { Selection } from '../../engine';
import { text } from '../../engine/model/inline';
import { textSelection } from '../../engine/state/selection';
import { Transaction } from '../../engine/state/transaction';
import { buildState } from '../../engine/test-support/build-state';
import { replaceInlineStep } from '../../engine/transform/replace-inline-step';
import { createOutsideChanges } from './outside-changes';

const caret = (offset: number) => textSelection({ block: 'b0', region: 'text', offset });
const state = buildState(['hello'], { block: 0, offset: 5 });
const insertion = () => new Transaction(state).step(replaceInlineStep('b0', 'text', 0, 0, [text('XX')]));

describe('outside changes', () => {
  it('notes a change made outside only while the editor has focus, once', () => {
    let focused = false;
    const outside = createOutsideChanges(() => focused, () => null);
    outside.committed(null);
    expect(outside.takeFocused()).toBe(false);
    focused = true;
    outside.committed(null);
    focused = false;
    outside.committed(null);
    expect(outside.takeFocused()).toBe(true);
    expect(outside.takeFocused()).toBe(false);
  });

  it('ignores changes made inside, even after one of them threw', () => {
    const outside = createOutsideChanges(() => true, () => caret(1));
    outside.inside(() => outside.committed(insertion()));
    expect(outside.takeFocused()).toBe(false);
    expect(outside.takeMoved()).toBeNull();
    expect(() =>
      outside.inside(() => {
        throw new RangeError('stale');
      }),
    ).toThrow(RangeError);
    outside.committed(null);
    expect(outside.takeFocused()).toBe(true);
  });

  it('reads the selection the browser moved once, against the selection before the change, and maps it once taken', () => {
    const models: (Selection | null)[] = [];
    const outside = createOutsideChanges(
      () => true,
      (model) => {
        models.push(model);
        return caret(1);
      },
    );
    outside.committed(insertion());
    outside.committed(insertion());
    expect(models).toEqual([caret(5)]);
    expect(outside.takeMoved()).toEqual(caret(5));
    expect(outside.takeMoved()).toBeNull();
  });

  it('drops the selection the browser moved once a change sets the selection, and reads none without focus', () => {
    let focused = true;
    const outside = createOutsideChanges(() => focused, () => caret(1));
    outside.committed(insertion());
    outside.committed(new Transaction(state).setSelection(caret(2)));
    expect(outside.takeMoved()).toBeNull();
    focused = false;
    outside.committed(insertion());
    expect(outside.takeMoved()).toBeNull();
  });

  it('reads no selection the browser moved after a change from outside set the selection, until it is taken', () => {
    const outside = createOutsideChanges(() => true, () => caret(1));
    outside.committed(new Transaction(state).setSelection(caret(2)));
    outside.committed(insertion());
    expect(outside.takeMoved()).toBeNull();
    outside.committed(insertion());
    expect(outside.takeMoved()).toEqual(caret(3));
  });

  // The second change is a plain one, then one that only hands an extension's plugin new state, as presence does.
  it.each([
    ['a change', (tr: Transaction) => tr],
    ['one that hands presence its collaborators', (tr: Transaction) => tr.setOrigin('remote').setMeta('presence', [])],
  ])('reads the browser selection at most once before the next draw, the second being %s', (_, shaped) => {
    const models: (Selection | null)[] = [];
    const outside = createOutsideChanges(
      () => true,
      (model) => {
        models.push(model);
        return null;
      },
    );
    const first = insertion();
    outside.committed(first);
    const after = { ...state, doc: first.doc, selection: caret(7) };
    outside.committed(shaped(new Transaction(after)));
    expect(models).toEqual([caret(5)]);
    expect(outside.takeMoved()).toBeNull();
    outside.committed(shaped(new Transaction(after)));
    expect(models).toEqual([caret(5), caret(7)]);
  });
});
