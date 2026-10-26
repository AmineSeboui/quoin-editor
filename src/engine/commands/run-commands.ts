import { applyTransaction, type EditorState } from '../state/editor-state';
import { sameSelection } from '../state/selection';
import { Transaction, UNFILTERED, type TransactionOrigin } from '../state/transaction';
import type { Command } from './command';

/** The dispatch a chain of several commands hands them, so a command applying its change elsewhere can refuse it. */
export const chainDispatches = new WeakSet<(tr: Transaction) => void>();

const movesHistory = (tr: Transaction) => tr.getMeta('history') !== undefined;

// An undo or redo item only fits a transaction of its own, so it can share a chain with nothing but selection changes.
function mergeable(parts: readonly Transaction[]): boolean {
  const moving = parts.filter(movesHistory).length;
  return moving === 0 || (moving === 1 && parts.every((part) => movesHistory(part) || !part.docChanged));
}

function combine(initial: EditorState, parts: readonly Transaction[], final: EditorState): Transaction {
  if (parts.length === 1) return parts[0];
  const tr = new Transaction(initial, parts[0].time);
  for (const part of parts) {
    part.steps.forEach((step) => tr.step(step));
    part.meta.forEach((value, key) => key !== UNFILTERED && tr.setMeta(key, value));
  }
  const moving = parts.find(movesHistory);
  const origins = new Set<TransactionOrigin>(parts.map((part) => part.origin));
  if (moving !== undefined) tr.setOrigin(moving.origin);
  else if (origins.size === 1) tr.setOrigin(parts[0].origin);
  else tr.setOrigin('command');
  if (parts.every((part) => part.getMeta(UNFILTERED) === true)) tr.setMeta(UNFILTERED, true);
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
  const collect = (tr: Transaction) => {
    parts.push(tr);
    current = applyTransaction(current, tr);
  };
  if (commands.length > 1) chainDispatches.add(collect);
  for (const command of commands) {
    if (!command(current, collect)) return { ok: false, tr: null };
  }
  if (!mergeable(parts)) return { ok: false, tr: null };
  return { ok: true, tr: parts.length === 0 ? null : combine(state, parts, current) };
}
