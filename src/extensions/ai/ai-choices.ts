import { EMPTY_LINE_ACTIONS, MENU_ACTIONS, type AiAction } from './ai-actions';
import type { AiEnv } from './ai-env';
import type { AiActionDefinition } from './ai-host-actions';
import type { AiTarget } from './ai-target';

/** An entry of the AI menu: a built-in action, the typed request as `custom`, or one of the host's actions. */
export type AiChoice =
  | { readonly key: string; readonly label: string; readonly action: AiAction; readonly host?: undefined }
  | { readonly key: string; readonly label: string; readonly host: AiActionDefinition };

/**
 * The entries that match what was typed: the built-in actions, then the host's, then the typed request once there is
 * one. On an empty line, which has no text to change, the built-in ones are only those that write.
 */
export function choicesFor({ labels, actions }: AiEnv, target: AiTarget, query: string): AiChoice[] {
  const emptyLine = !target.selected && target.to.offset === 0;
  const wanted = query.trim().toLowerCase();
  const builtIn = (emptyLine ? EMPTY_LINE_ACTIONS : MENU_ACTIONS).map((action): AiChoice => ({
    key: action,
    label: labels.actions[action],
    action,
  }));
  const host = actions.map((definition): AiChoice => ({
    key: definition.id,
    label: definition.label,
    host: definition,
  }));
  const listed = [...builtIn, ...host].filter(({ label }) => label.toLowerCase().includes(wanted));
  if (wanted === '') return listed;
  return [...listed, { key: 'custom', label: labels.ask(query.trim()), action: 'custom' }];
}
