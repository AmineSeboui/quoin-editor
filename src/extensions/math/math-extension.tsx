'use client';

import { defineExtension, type Extension } from '../../engine';
import type { BlockRenderProps, ViewController } from '../../view';
import { selectAtomBackward } from '../atoms/select-atom-backward';
import { selectedAtomDecorations } from '../atoms/selected-atom-decorations';
import type { ExtensionUI } from '../ui-types';
import { inlineMathRenderer } from './InlineMath';
import { MathBlock } from './MathBlock';
import { MathEditorOverlay } from './MathEditorOverlay';
import { MATH_ATOMS, type MathFeature, type RenderMath } from './math-feature';
import { resolveMathLabels, type MathLabels } from './math-labels';
import { inlineMathRule } from './math-rules';

export type MathOptions = {
  /**
   * Draws the LaTeX of every block and formula as HTML, which is trusted and inserted as it is, as KaTeX's
   * `renderToString` does. Without it the LaTeX shows as text.
   */
  renderMath?: RenderMath;
  /** Every string the feature shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<MathLabels>;
};

// Above the core keys, so that Backspace right after a formula selects it before the core one would delete it.
const ABOVE_CORE_KEYS = 200;

/**
 * Math: MATH blocks and math formulas in a line drawn by the host's `renderMath` or as their LaTeX, edited in a popover
 * with a live preview, and formulas typed between dollars as the markdown reads them.
 */
export function mathExtension(options: MathOptions = {}): Extension {
  const feature: MathFeature = { labels: resolveMathLabels(options.labels), renderMath: options.renderMath };
  const MathRenderer = (props: BlockRenderProps) => <MathBlock {...props} feature={feature} />;
  const EditorOverlay = ({ controller }: { controller: ViewController }) => (
    <MathEditorOverlay controller={controller} feature={feature} />
  );
  const ui: ExtensionUI = {
    renderers: { MATH: MathRenderer },
    render: { atoms: { math: inlineMathRenderer(feature) } },
    overlays: [EditorOverlay],
  };
  return defineExtension({
    name: 'math',
    priority: ABOVE_CORE_KEYS,
    inputRules: [inlineMathRule],
    keymap: { Backspace: selectAtomBackward(MATH_ATOMS) },
    decorations: selectedAtomDecorations(MATH_ATOMS),
    ui,
  });
}
