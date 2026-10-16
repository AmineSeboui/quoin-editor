'use client';

import { useLabels } from '../../i18n/use-labels';
import type { BlockRenderProps } from '../../view';

/** Draws a block no definition or renderer covers, under a readable name rather than its stored type. */
export function UnregisteredBlock({ block }: BlockRenderProps) {
  const labels = useLabels();
  if (block.type === 'DIVIDER') {
    return (
      <div className="py-3" contentEditable={false} role="separator" aria-label={labels.divider}>
        <div className="h-px bg-border" />
      </div>
    );
  }
  return (
    <div className="quoin-void" contentEditable={false} role="group" aria-label={labels.unsupportedBlock}>
      {labels.unsupportedBlock}
    </div>
  );
}
