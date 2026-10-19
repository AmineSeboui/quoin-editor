import type { Command, EditorState, Transaction } from '../../engine';
import { inlineText } from '../../engine/model/inline';
import type { SlashItem, SuggestionRange } from '../../extensions/ui-types';
import type { ViewController } from '../../view';
import { replaceTrigger, triggerReplacement } from '../suggestion/replace-trigger';

const TEXT_STEPS: ReadonlySet<string> = new Set(['replaceInline', 'addMark', 'removeMark']);
const WHITESPACE = /\s/;

const changesBlocks = (tr: Transaction | null): boolean =>
  tr !== null && tr.steps.some((step) => !TEXT_STEPS.has(step.stepType));

// The space a slash was typed after would end the line, or double the next one, once the slash and the query are gone.
function withSpaceBefore({ doc }: EditorState, range: SuggestionRange): SuggestionRange | null {
  const inline = doc.blocks[doc.index.get(range.block) ?? -1]?.regions[range.region];
  if (inline === undefined || range.from === 0) return null;
  const text = inlineText(inline);
  const after = text.charAt(range.to);
  const spaced = WHITESPACE.test(text.charAt(range.from - 1)) && (after === '' || WHITESPACE.test(after));
  return spaced ? { ...range, from: range.from - 1 } : null;
}

// A command that changes blocks rather than text takes that space with the slash and the query.
function triggerRange(state: EditorState, range: SuggestionRange, command: Command | undefined): SuggestionRange {
  const wider = command === undefined ? null : withSpaceBefore(state, range);
  return wider !== null && changesBlocks(triggerReplacement(state, range, command).tr) ? wider : range;
}

/** Removes the slash and the query with the item's command in one transaction, then runs the item's own work. */
export function chooseSlashItem(controller: ViewController, item: SlashItem, range: SuggestionRange): void {
  const { state } = controller.editor;
  const command = item.command?.({ state, range });
  if (!replaceTrigger(controller, triggerRange(state, range, command), command)) return;
  item.run?.({ controller, range: { ...range, to: range.from } });
}
