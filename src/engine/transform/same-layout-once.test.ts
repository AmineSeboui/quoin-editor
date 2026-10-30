import { describe, expect, it, vi } from 'vitest';
import { buildState } from '../test-support/build-state';
import { applyTransaction } from '../state/editor-state';
import { historyPlugin } from '../state/history';
import { Transaction } from '../state/transaction';
import type * as SameLayout from './same-layout';
import { setAttrsStep } from './attrs-steps';

const layout = vi.hoisted(() => ({ calls: 0 }));

vi.mock('./same-layout', async (importOriginal) => {
  const original = await importOriginal<typeof SameLayout>();
  return {
    ...original,
    sameLayout: (...args: Parameters<typeof original.sameLayout>) => {
      layout.calls++;
      return original.sameLayout(...args);
    },
  };
});

describe('the layout check of a neutral transaction', () => {
  it('runs once however many attribute steps the transaction holds', () => {
    const toggles = Array.from({ length: 50 }, (_, i) => ({ id: `t${i}`, type: 'TOGGLE', data: { markdown: 'x', open: false } }));
    const state = buildState(toggles, null, { plugins: [historyPlugin()] });
    const tr = new Transaction(state).setMeta('addToHistory', false);
    state.doc.blocks.forEach((block) => tr.step(setAttrsStep(block.id, { open: true })));
    layout.calls = 0;
    applyTransaction(state, tr);
    expect(layout.calls).toBe(1);
  });
});
