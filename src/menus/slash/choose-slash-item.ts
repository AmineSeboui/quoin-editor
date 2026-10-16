import type { SlashItem, SuggestionRange } from '../../extensions/ui-types';
import type { ViewController } from '../../view';
import { replaceTrigger } from '../suggestion/replace-trigger';

/** Removes the slash and the query with the item's command in one transaction, then runs the item's own work. */
export function chooseSlashItem(controller: ViewController, item: SlashItem, range: SuggestionRange): void {
  const command = item.command?.({ state: controller.editor.state, range });
  if (!replaceTrigger(controller, range, command)) return;
  item.run?.({ controller, range: { ...range, to: range.from } });
}
