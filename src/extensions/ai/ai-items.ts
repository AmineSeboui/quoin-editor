import type { BlockMenuAction } from '../../gutter/block-menu-items';
import { PenLine, Sparkles } from '../../icons';
import type { SlashItem, ToolbarItem } from '../ui-types';
import type { AiStream } from './ai-actions';
import { askFrom } from './ai-env';
import type { AiLabels } from './ai-labels';
import { blocksHaveTarget, openForBlocks, openForSelection } from './ai-open';
import { aiState } from './ai-plugin';

export const AI_KEYWORDS = ['ai', 'assistant', 'write', 'generate'];

export function aiSlashItems(labels: AiLabels, stream: AiStream): SlashItem[] {
  return [
    {
      id: 'ai',
      title: labels.askAi,
      description: labels.askAiDescription,
      group: 'ai',
      icon: Sparkles,
      keywords: AI_KEYWORDS,
      run: ({ controller }) => void openForSelection(controller),
    },
    {
      id: 'ai-continue',
      title: labels.actions.continue,
      group: 'ai',
      icon: PenLine,
      keywords: [...AI_KEYWORDS, 'continue'],
      run: ({ controller }) => {
        if (openForSelection(controller)) askFrom({ controller, stream }, 'continue');
      },
    },
  ];
}

export const aiBubbleItem = (labels: AiLabels): ToolbarItem => ({
  id: 'ai',
  title: labels.askAi,
  icon: Sparkles,
  available: (state) => aiState(state).ghost === null,
  run: (controller) => void openForSelection(controller),
});

export const aiBlockMenuItem = (labels: AiLabels): BlockMenuAction => ({
  id: 'ai',
  label: labels.askAi,
  icon: Sparkles,
  available: blocksHaveTarget,
  run: (controller, blockIds) => void openForBlocks(controller, blockIds),
});
