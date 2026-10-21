import { insertText, type Command } from '../../engine';
import { insertMention } from '../../engine/commands/marks';
import { runCommands } from '../../engine/commands/run-commands';
import { replaceTrigger } from '../../menus/suggestion/replace-trigger';
import type { ViewController } from '../../view';
import type { SuggestionRange } from '../ui-types';
import type { MentionResult } from './mention-feature';

const mentionAndSpace =
  ({ id, label, kind }: MentionResult): Command =>
  (state, dispatch) => {
    const { ok, tr } = runCommands(state, [insertMention({ id, label, kind }), insertText(' ')]);
    if (ok && tr !== null) dispatch?.(tr);
    return ok;
  };

/** Puts the chosen mention and a space where the `@` and the query were, in one transaction, so one undo brings them back. */
export function chooseMention(controller: ViewController, result: MentionResult, range: SuggestionRange): void {
  replaceTrigger(controller, range, mentionAndSpace(result));
}
