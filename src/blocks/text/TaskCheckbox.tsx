'use client';

import { useLabels } from '../../i18n/use-labels';
import type { BlockRenderProps } from '../../view';
import { TaskCheckbox as ViewTaskCheckbox } from '../../view/react/TaskCheckbox';

export function TaskCheckbox({ block, controller }: Pick<BlockRenderProps, 'block' | 'controller'>) {
  const labels = useLabels();
  return <ViewTaskCheckbox block={block} controller={controller} label={labels.task} />;
}
