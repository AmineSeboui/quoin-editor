import type { EngineBlock } from '../engine';
import { blockTypeLabel } from '../gutter/block-type-label';
import type { QuoinLabels } from '../i18n/labels';
import type { AnyBlockDefinition } from '../registry';

/** What the canvas calls a block selected as a whole whose text is empty: an image says it has no description. */
export const selectedBlockLabel =
  (labels: QuoinLabels, definitions: AnyBlockDefinition[]) =>
  (block: EngineBlock): string =>
    block.type === 'IMAGE' ? labels.imageNoAlt : blockTypeLabel(labels, block, definitions);
