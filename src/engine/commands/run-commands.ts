import { applyTransaction, type EditorState } from '../state/editor-state';
import { sameSelection } from '../state/selection';
import { Transaction, type TransactionOrigin } from '../state/transaction';
import type { Command } from './command';

function combine(initial: EditorState, parts: readonly Transaction[], final: EditorState): Transaction {
  if (parts.length === 1) return parts[0];
  const tr = new Transaction(initial, parts[0].time);
  for (const part of parts) part.steps.forEach((step) => tr.step(step));
  const origins = new Set<TransactionOrigin>(parts.map((part) => part.origin));
  if (origins.size === 1) tr.setOrigin(parts[0].origin);
  if (parts.some((part) => !part.addToHistory)) tr.setMeta('addToHistory', false);
  if (parts.some((part) => part.getMeta<boolean>('closeHistory') === true)) tr.setMeta('closeHistory', true);
  if (!sameSelection(tr.selection, final.selection)) tr.setSelection(final.selection);
  if (final.storedMarks !== initial.storedMarks) tr.setStoredMarks(final.storedMarks);
  return tr;
}

export function runCommands(
  state: EditorState,
  commands: readonly Command[],
): { ok: boolean; tr: Transaction | null } {
  let current = state;
  const parts: Transaction[] = [];
  for (const command of commands) {
    const ok = command(current, (tr) => {
      parts.push(tr);
      current = applyTransaction(current, tr);
    });
    if (!ok) return { ok: false, tr: null };
  }
  return { ok: true, tr: parts.length === 0 ? null : combine(state, parts, current) };
}
