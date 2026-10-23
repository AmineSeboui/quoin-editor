import { PenLine, Sparkles } from 'lucide-react';
import type { BlockMenuAction } from '../../gutter/block-menu-items';
import type { ViewController } from '../../view';
import type { SlashItem, ToolbarItem } from '../ui-types';
import type { AiStream } from './ai-actions';
import { askFrom } from './ai-env';
import { openMenu } from './ai-flow';
import type { AiLabels } from './ai-labels';
import { aiState } from './ai-plugin';
import { targetOfBlocks, targetOfSelection } from './ai-target';

function openFor(controller: ViewController): boolean {
  const target = targetOfSelection(controller.editor.state);
  if (target !== null) openMenu(controller.editor, target, false);
  return target !== null;
}

const KEYWORDS = ['ai', 'assistant', 'write', 'generate'];

export function aiSlashItems(labels: AiLabels, stream: AiStream): SlashItem[] {
  return [
    {
      id: 'ai',
      title: labels.askAi,
      description: labels.askAiDescription,
      group: 'ai',
      icon: Sparkles,
      keywords: KEYWORDS,
      run: ({ controller }) => void openFor(controller),
    },
    {
      id: 'ai-continue',
      title: labels.actions.continue,
      group: 'ai',
      icon: PenLine,
      keywords: [...KEYWORDS, 'continue'],
      run: ({ controller }) => {
        if (openFor(controller)) askFrom({ controller, stream, labels }, 'continue');
      },
    },
  ];
}

export const aiBubbleItem = (labels: AiLabels): ToolbarItem => ({
  id: 'ai',
  title: labels.askAi,
  icon: Sparkles,
  available: (state) => aiState(state).ghost === null,
  run: (controller) => void openFor(controller),
});

export const aiBlockMenuItem = (labels: AiLabels): BlockMenuAction => ({
  id: 'ai',
  label: labels.askAi,
  icon: Sparkles,
  available: (state, blockIds) => targetOfBlocks(state, blockIds) !== null,
  run: (controller, blockIds) => {
    const target = targetOfBlocks(controller.editor.state, blockIds);
    if (target !== null) openMenu(controller.editor, target, false);
  },
});
