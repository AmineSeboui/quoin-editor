import type { BlockMenuAction } from '../../gutter/block-menu-items';
import { Sparkles } from '../../icons';
import type { ExtensionUI } from '../ui-types';
import type { AiStream } from './ai-actions';
import { askHost } from './ai-env';
import { placedIn, type AiActionDefinition } from './ai-host-actions';
import { AI_KEYWORDS } from './ai-items';
import { blocksHaveTarget, openForBlocks, openForSelection } from './ai-open';
import { aiState } from './ai-plugin';

type HostItems = Required<Pick<ExtensionUI, 'slashItems' | 'bubbleItems' | 'blockMenuItems'>>;

/** The host's actions placed beyond the AI menu, each asking at once about what that place is about. */
export function hostItems(actions: readonly AiActionDefinition[], stream: AiStream): HostItems {
  const itemOf = (definition: AiActionDefinition) => ({
    id: `ai-${definition.id}`,
    icon: definition.icon ?? Sparkles,
  });
  return {
    slashItems: actions.filter(placedIn('slashMenu')).map((definition) => ({
      ...itemOf(definition),
      title: definition.label,
      group: 'ai',
      keywords: AI_KEYWORDS,
      run: ({ controller }) => {
        if (openForSelection(controller)) askHost({ controller, stream }, definition);
      },
    })),
    bubbleItems: actions.filter(placedIn('bubbleToolbar')).map((definition) => ({
      ...itemOf(definition),
      title: definition.label,
      available: (state) => aiState(state).ghost === null,
      run: (controller) => {
        if (openForSelection(controller)) askHost({ controller, stream }, definition);
      },
    })),
    blockMenuItems: actions.filter(placedIn('blockMenu')).map((definition): BlockMenuAction => ({
      ...itemOf(definition),
      label: definition.label,
      available: blocksHaveTarget,
      run: (controller, blockIds) => {
        if (openForBlocks(controller, blockIds)) askHost({ controller, stream }, definition);
      },
    })),
  };
}
