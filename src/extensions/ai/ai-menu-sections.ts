import { WRITE_ACTIONS } from './ai-actions';
import type { AiChoice } from './ai-choices';
import { englishAiLabels, type AiLabels } from './ai-labels';

export type ChoiceRow = { readonly choice: AiChoice; readonly index: number };

/** A run of the menu's choices under its heading: the actions that write, those that edit, the host's own, and the
 *  typed request, which has none. */
export type ChoiceSection = {
  readonly id: 'write' | 'edit' | 'host' | 'ask';
  readonly label?: string;
  readonly rows: ChoiceRow[];
};

const sectionOf = (choice: AiChoice): ChoiceSection['id'] => {
  if (choice.host !== undefined) return 'host';
  if (choice.action === 'custom') return 'ask';
  return WRITE_ACTIONS.includes(choice.action) ? 'write' : 'edit';
};

/** The choices in their order, as runs under the heading each run takes; `index` is a row's place in `choices`. */
export function menuSections(choices: readonly AiChoice[], labels: AiLabels): ChoiceSection[] {
  const headings = {
    write: labels.writeGroup ?? englishAiLabels.writeGroup,
    edit: labels.editGroup ?? englishAiLabels.editGroup,
    host: labels.moreActions ?? englishAiLabels.moreActions,
    ask: undefined,
  };
  const sections: ChoiceSection[] = [];
  choices.forEach((choice, index) => {
    const id = sectionOf(choice);
    const last = sections.at(-1);
    if (last?.id === id) last.rows.push({ choice, index });
    else sections.push({ id, label: headings[id], rows: [{ choice, index }] });
  });
  return sections;
}
