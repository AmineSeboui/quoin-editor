import type { Command } from '../commands/command';
import { runCommands } from '../commands/run-commands';
import type { EditorState } from '../state/editor-state';
import { Transaction } from '../state/transaction';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { InputRuleRange } from './input-rule';

export function convertPrefix(state: EditorState, range: InputRuleRange, convert: Command): Transaction | null {
  const { block, region, from, to } = range;
  const removePrefix: Command = (current, dispatch) => {
    dispatch?.(new Transaction(current).step(replaceInlineStep(block, region, from, to, [])));
    return true;
  };
  return runCommands(state, [removePrefix, convert]).tr;
}
