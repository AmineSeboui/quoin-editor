'use client';

import { useMemo, useRef } from 'react';
import { str } from '../../engine/blocks/data-fields';
import { selectNode } from '../../blocks/void/select-node';
import { useNodeKeys } from '../../blocks/void/use-node-keys';
import type { BlockRenderProps } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';
import type { MathFeature } from './math-feature';
import { openMath } from './math-target';
import { MathOutput } from './MathOutput';

type MathBlockProps = BlockRenderProps & { feature: MathFeature };

/**
 * A display equation. On an editable canvas a click, or Enter while the block is selected as a whole, opens its editor,
 * and a key typed on the selected block never replaces it.
 */
export function MathBlock({ block, controller, feature }: MathBlockProps) {
  const readOnly = useReadOnly(controller);
  const root = useRef<HTMLDivElement>(null);
  const blockId = block.id;
  const latex = str(block.attrs.latex);
  const keys = useMemo(
    () => ({ enter: () => openMath(controller, { kind: 'block', block: blockId, latex }) }),
    [controller, blockId, latex],
  );
  useNodeKeys(controller, blockId, !readOnly, true, root, keys);
  const open = () => {
    selectNode(controller, blockId);
    keys.enter();
  };

  return (
    <div
      ref={root}
      role="group"
      aria-label={feature.labels.equation}
      contentEditable={false}
      className="quoin-math"
      data-editable={readOnly ? undefined : ''}
      onClick={readOnly ? undefined : open}
    >
      <MathOutput feature={feature} latex={latex} displayMode />
    </div>
  );
}
