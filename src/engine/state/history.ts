import { caretMarks } from '../commands/caret-marks';
import type { Command } from '../commands/command';
import { text } from '../model/inline';
import type { Mark, Pos, Selection } from '../model/types';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { Step } from '../transform/step';
import type { EditorState } from './editor-state';
import { createPluginKey, type PluginSpec } from './plugin';
import { isCollapsed, sameSelection, textSelection } from './selection';
import { Transaction, type TransactionOrigin } from './transaction';

export type HistoryItem = {
  readonly steps: readonly Step[];
  readonly selection: Selection | null;
  readonly origin: TransactionOrigin;
};

export type InputRuleRecord = {
  readonly steps: readonly Step[];
  readonly undoText: string;
  readonly at: Pos;
  readonly marks: readonly Mark[];
};

export type HistoryState = {
  readonly done: readonly HistoryItem[];
  readonly undone: readonly HistoryItem[];
  readonly lastTime: number;
  readonly lastGroup: string | null;
  readonly lastInputRule: InputRuleRecord | null;
};

type Direction = 'undo' | 'redo';
type Config = { readonly depth: number; readonly groupDelay: number };

export const historyKey = createPluginKey<HistoryState>('history');

const emptyHistory: HistoryState = { done: [], undone: [], lastTime: 0, lastGroup: null, lastInputRule: null };

const historyOf = (state: EditorState): HistoryState | undefined =>
  state.pluginState.get(historyKey.name) as HistoryState | undefined;

function invertTransaction(tr: Transaction): Step[] {
  return tr.steps.map((step, i) => step.invert(tr.docs[i])).reverse();
}

const newest = (items: readonly HistoryItem[], depth: number) => items.slice(Math.max(0, items.length - depth));

function groupKey(selection: Selection | null): string | null {
  return selection?.kind === 'text' ? JSON.stringify([selection.head.block, selection.head.region]) : null;
}

function inputRuleRecord(tr: Transaction, steps: readonly Step[]): InputRuleRecord | null {
  const rule = tr.getMeta<{ undoText: string }>('inputRule');
  const before = tr.before.selection;
  if (rule === undefined || before?.kind !== 'text' || !isCollapsed(before)) return null;
  const { doc, schema, storedMarks } = tr.before;
  return { steps, undoText: rule.undoText, at: before.head, marks: caretMarks(doc, schema, storedMarks, before.head) };
}

function recorded(tr: Transaction, value: HistoryState, { depth, groupDelay }: Config): HistoryState {
  const steps = invertTransaction(tr);
  const closed = tr.getMeta<boolean>('closeHistory') === true;
  const group = tr.origin === 'input' && !closed ? groupKey(tr.before.selection) : null;
  const last = value.done.at(-1);
  const merges =
    last !== undefined && group !== null && group === value.lastGroup && tr.time - value.lastTime < groupDelay;
  const done = merges
    ? [...value.done.slice(0, -1), { ...last, steps: [...steps, ...last.steps] }]
    : newest([...value.done, { steps, selection: tr.before.selection, origin: tr.origin }], depth);
  return { done, undone: [], lastTime: tr.time, lastGroup: group, lastInputRule: inputRuleRecord(tr, steps) };
}

function moved(tr: Transaction, value: HistoryState, direction: Direction, depth: number): HistoryState {
  const undoing = direction === 'undo';
  const source = undoing ? value.done : value.undone;
  const applied = source.length - 1 - (tr.getMeta<number>('historySkipped') ?? 0);
  const inverse: HistoryItem = {
    steps: invertTransaction(tr),
    selection: tr.before.selection,
    origin: source[applied]?.origin ?? tr.origin,
  };
  const rest = source.slice(0, applied);
  const target = newest([...(undoing ? value.undone : value.done), inverse], depth);
  const stacks = undoing ? { done: rest, undone: target } : { done: target, undone: rest };
  return { ...value, ...stacks, lastGroup: null, lastInputRule: null };
}

const unrecordedOrigins: readonly TransactionOrigin[] = ['remote', 'reconcile', 'history'];

function advance(tr: Transaction, value: HistoryState, config: Config): HistoryState {
  if (tr.docChanged) {
    const direction = tr.getMeta<Direction>('history');
    if (direction !== undefined) return moved(tr, value, direction, config.depth);
    const records = tr.addToHistory && !unrecordedOrigins.includes(tr.origin);
    return records ? recorded(tr, value, config) : emptyHistory;
  }
  const closed = tr.getMeta<boolean>('closeHistory') === true;
  const relocated = tr.selectionSet && !sameSelection(tr.before.selection, tr.selection);
  return {
    ...value,
    lastGroup: closed ? null : value.lastGroup,
    lastInputRule: relocated || tr.storedMarksSet ? null : value.lastInputRule,
  };
}

export function historyPlugin(options: { depth?: number; groupDelay?: number } = {}): PluginSpec<HistoryState> {
  const config: Config = { depth: options.depth ?? 200, groupDelay: options.groupDelay ?? 500 };
  return { key: historyKey, init: () => emptyHistory, apply: (tr, value) => advance(tr, value, config) };
}

function travel(direction: Direction): Command {
  return (state, dispatch) => {
    const history = historyOf(state);
    const items = (direction === 'undo' ? history?.done : history?.undone) ?? [];
    for (let i = items.length - 1; i >= 0; i--) {
      const tr = new Transaction(state).setOrigin('history').setMeta('history', direction);
      if (!items[i].steps.every((step) => tr.maybeStep(step))) continue;
      const { selection } = items[i];
      if (selection !== null) tr.setSelection(selection);
      dispatch?.(tr.setMeta('historySkipped', items.length - 1 - i));
      return true;
    }
    return false;
  };
}

export const undo: Command = travel('undo');
export const redo: Command = travel('redo');

export const undoInputRule: Command = (state, dispatch) => {
  const record = historyOf(state)?.lastInputRule;
  if (record === null || record === undefined) return false;
  if (dispatch !== undefined) {
    const { steps, undoText, at, marks } = record;
    const tr = new Transaction(state);
    steps.forEach((step) => tr.step(step));
    tr.step(replaceInlineStep(at.block, at.region, at.offset, at.offset, [text(undoText, marks)]));
    dispatch(tr.setSelection(textSelection({ ...at, offset: at.offset + undoText.length })));
  }
  return true;
};

export function closeHistory(tr: Transaction): Transaction {
  return tr.setMeta('closeHistory', true);
}

export function undoDepth(state: EditorState): number {
  return historyOf(state)?.done.length ?? 0;
}

export function redoDepth(state: EditorState): number {
  return historyOf(state)?.undone.length ?? 0;
}
