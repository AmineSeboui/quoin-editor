import { createRef } from 'react';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import { defineExtension } from '../../engine';
import type { ExtensionUI } from '../ui-types';

/** An extension whose overlay draws a second canvas inside the first one's tree and DOM, as a host's own block could. */
export function nestedCanvas() {
  const inner = createRef<QuoinEditorHandle>();
  function Nested() {
    return (
      <BlockCanvas ref={inner} blocks={[{ id: 'n', type: 'MARKDOWN', data: { markdown: 'nested' } }]} onChange={() => {}} />
    );
  }
  const ui: ExtensionUI = { overlays: [Nested] };
  return { extension: defineExtension({ name: 'nested-canvas', ui }), inner };
}
