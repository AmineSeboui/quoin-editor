import type { Command } from '../commands/command';
import { insertText } from '../commands/insert-text';
import { runCommands } from '../commands/run-commands';
import { requireBlockIndex } from '../model/doc';
import { inlineText, marksAt, sliceInline } from '../model/inline';
import { hasMark } from '../model/marks';
import { newId } from '../model/new-id';
import type { EngineBlock } from '../model/types';
import type { EditorState } from '../state/editor-state';
import type { Transaction } from '../state/transaction';

export type InputRuleRange = { block: string; region: string; from: number; to: number };

export type InputRuleContext = { readonly newId: () => string };

export type InputRule = {
  readonly name: string;
  readonly match: RegExp;
  readonly blockTypes?: readonly string[];
  readonly kinds?: readonly string[];
  handler(
    state: EditorState,
    match: RegExpExecArray,
    range: InputRuleRange,
    context?: InputRuleContext,
  ): Transaction | null;
};

function appliesTo(rule: InputRule, block: EngineBlock): boolean {
  const { blockTypes, kinds } = rule;
  const { kind } = block.attrs;
  if (blockTypes !== undefined && !blockTypes.includes(block.type)) return false;
  return kinds === undefined || (typeof kind === 'string' && kinds.includes(kind));
}

function ruleTransaction(
  state: EditorState,
  rules: readonly InputRule[],
  context: InputRuleContext,
): Transaction | null {
  const { selection, doc } = state;
  if (selection?.kind !== 'text') return null;
  const { block: id, region, offset } = selection.head;
  const block = doc.blocks[requireBlockIndex(doc, id)];
  const inline = block.regions[region];
  if (hasMark(marksAt(inline, offset, () => true), 'code')) return null;
  const before = inlineText(sliceInline(inline, 0, offset));
  for (const rule of rules) {
    const match = appliesTo(rule, block) ? rule.match.exec(before) : null;
    if (match === null) continue;
    const tr = rule.handler(state, match, { block: id, region, from: match.index, to: offset }, context);
    if (tr !== null) return tr;
  }
  return null;
}

export function insertTextWithRules(
  value: string,
  rules: readonly InputRule[],
  options: { newId?: () => string } = {},
): Command {
  const context: InputRuleContext = { newId: options.newId ?? newId };
  const insert = insertText(value, { newId: context.newId });
  return (state, dispatch) => {
    let fired = false;
    const applyRules: Command = (current, emit) => {
      const tr = ruleTransaction(current, rules, context);
      if (tr !== null) {
        fired = true;
        emit?.(tr.setOrigin('input'));
      }
      return true;
    };
    const { ok, tr } = runCommands(state, [insert, applyRules]);
    if (!ok || tr === null) return false;
    if (fired) tr.setMeta('inputRule', { undoText: value });
    dispatch?.(tr);
    return true;
  };
}
