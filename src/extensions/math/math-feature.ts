import type { HTMLOptions } from '../../engine';
import type { MathLabels } from './math-labels';

/** The atom types the feature draws, edits and selects whole. */
export const MATH_ATOMS: readonly string[] = ['math'];

/**
 * Turns LaTeX into HTML, as KaTeX's `renderToString` does, in display mode for a block and inline for a formula in a
 * line: the same function `toHTML` takes. Its HTML is trusted: the canvas inserts it as it is.
 */
export type RenderMath = NonNullable<HTMLOptions['renderMath']>;

/** The options of one math extension, resolved once, shared by its blocks, its formulas and its editor. */
export type MathFeature = { readonly labels: MathLabels; readonly renderMath: RenderMath | undefined };
