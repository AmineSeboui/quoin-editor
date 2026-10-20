'use client';

import { useLabels } from '../../i18n/use-labels';
import type { BlockRenderProps } from '../../view';
import { TaskCheckbox as ViewTaskCheckbox } from '../../view/react/TaskCheckbox';

type TaskCheckboxProps = Pick<BlockRenderProps, 'block' | 'controller'> & { labelledBy: string };

export function TaskCheckbox({ block, controller, labelledBy }: TaskCheckboxProps) {
  const labels = useLabels();
  return <ViewTaskCheckbox block={block} controller={controller} label={labels.task} labelledBy={labelledBy} />;
}
