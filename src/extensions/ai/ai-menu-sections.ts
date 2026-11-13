import { EDIT_ACTIONS, EMPTY_LINE_ACTIONS, WRITE_ACTIONS, type AiAction } from './ai-actions';
import type { AiEnv } from './ai-env';
import { englishAiLabels } from './ai-labels';
import type { AiTarget } from './ai-target';

export type Choice = { readonly action: AiAction; readonly label: string };

/** A run of the menu's choices: the actions that write, those that edit, and the typed request on its own. */
export type ChoiceSection = { readonly id: 'write' | 'edit' | 'ask'; readonly label?: string; readonly choices: readonly Choice[] };

/** The menu's choices for what is typed, by section, leaving out a section nothing in it matches. Their order,
 *  section after section, is the order the arrows walk. */
export function menuSections({ labels }: AiEnv, target: AiTarget, query: string): ChoiceSection[] {
  const emptyLine = !target.selected && target.to.offset === 0;
  const wanted = query.trim().toLowerCase();
  const matching = (actions: readonly AiAction[]) =>
    actions
      .filter((action) => labels.actions[action].toLowerCase().includes(wanted))
      .map((action) => ({ action, label: labels.actions[action] }));
  const sections: ChoiceSection[] = [
    { id: 'write', label: labels.writeGroup ?? englishAiLabels.writeGroup, choices: matching(emptyLine ? EMPTY_LINE_ACTIONS : WRITE_ACTIONS) },
    { id: 'edit', label: labels.editGroup ?? englishAiLabels.editGroup, choices: emptyLine ? [] : matching(EDIT_ACTIONS) },
  ];
  if (wanted !== '') sections.push({ id: 'ask', choices: [{ action: 'custom', label: labels.ask(query.trim()) }] });
  return sections.filter((section) => section.choices.length > 0);
}
