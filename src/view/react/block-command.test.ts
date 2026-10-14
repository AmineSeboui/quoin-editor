import { describe, expect, it } from 'vitest';
import { toggleTask } from '../../engine/commands/block-structure';
import { setAttrs } from '../../engine/commands/block-style';
import { applyTransaction } from '../../engine/state/editor-state';
import { buildState, caretOf, markdownOf } from '../../engine/test-support/build-state';
import type { Transaction } from '../../engine';
import { onBlock } from './block-command';

function run(state: ReturnType<typeof buildState>, command: ReturnType<typeof onBlock>) {
  const sent: Transaction[] = [];
  const ok = command(state, (tr) => sent.push(tr));
  const next = sent.length === 1 ? applyTransaction(state, sent[0]) : state;
  return { ok, sent: sent.length, next };
}

describe('onBlock', () => {
  it('runs a selection-based command on the named block and keeps the caret where it was', () => {
    const state = buildState(['- [ ] one', '- [ ] two', 'plain'], { block: 2, offset: 3 });
    const { ok, sent, next } = run(state, onBlock('b0', toggleTask));
    expect(ok).toBe(true);
    expect(sent).toBe(1);
    expect(markdownOf(next)).toEqual(['- [x] one', '- [ ] two', 'plain']);
    expect(caretOf(next)).toEqual({ block: 2, offset: 3 });
  });

  it('keeps a selection that was a range of blocks', () => {
    const state = buildState(['- [ ] one', 'two'], { blocks: [0, 1] });
    const { next } = run(state, onBlock('b0', toggleTask));
    expect(caretOf(next)).toEqual({ blocks: [0, 1] });
  });

  it('dispatches nothing and reports false when the command does not apply to that block', () => {
    const state = buildState(['- [ ] one', 'two'], { block: 0, offset: 0 });
    const { ok, sent } = run(state, onBlock('b1', toggleTask));
    expect(ok).toBe(false);
    expect(sent).toBe(0);
  });

  it('acts as a dry run without a dispatch function', () => {
    const state = buildState(['- [ ] one'], null);
    expect(onBlock('b0', toggleTask)(state)).toBe(true);
    expect(onBlock('b0', setAttrs({ open: true }))(state)).toBe(true);
  });
});
