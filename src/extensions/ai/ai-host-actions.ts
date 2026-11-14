import type { ComponentType } from 'react';
import { devWarn } from '../../dev-warn';
import { MENU_ACTIONS, type AiAction, type AiRequest } from './ai-actions';

/** Where a host's action is offered: the AI menu, the slash menu, the toolbar over selected text or the block menu. */
export type AiActionPlace = 'aiMenu' | 'slashMenu' | 'bubbleToolbar' | 'blockMenu';

/** An action of the host's own, sent to its `stream` as a `custom` request whose `actionId` is the action's `id`. */
export type AiActionDefinition = {
  /** Unique among the host's actions, and none of the built-in action names such as `improve` or `custom`. */
  id: string;
  /** Its name in the menus, which the host words and translates itself. */
  label: string;
  /** The request's `prompt`, or a function of the rest of the request that returns it when the action is chosen. */
  prompt: string | ((request: Omit<AiRequest, 'prompt'>) => string);
  /** Drawn beside the label in the slash menu, the toolbar and the block menu; Sparkles when left out. */
  icon?: ComponentType<{ className?: string }>;
  /** Where the action is offered: the AI menu alone when left out. */
  places?: readonly AiActionPlace[];
};

const BUILT_IN: ReadonlySet<string> = new Set<AiAction>([...MENU_ACTIONS, 'custom']);

const IN_AI_MENU: readonly AiActionPlace[] = ['aiMenu'];

/** The host's actions in their order, less any whose id a built-in action or an earlier one of them already has. */
export function hostActions(definitions: readonly AiActionDefinition[] = []): readonly AiActionDefinition[] {
  const seen = new Set<string>();
  return definitions.filter(({ id }) => {
    const holder = BUILT_IN.has(id) ? 'a built-in action' : seen.has(id) ? 'an earlier action' : null;
    seen.add(id);
    if (holder !== null) devWarn(`the AI action "${id}" has the id of ${holder}, so it is left out.`);
    return holder === null;
  });
}

export const placedIn =
  (place: AiActionPlace) =>
  (definition: AiActionDefinition): boolean =>
    (definition.places ?? IN_AI_MENU).includes(place);
