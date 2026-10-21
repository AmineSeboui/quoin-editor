'use client';

// The whole main entry, for the reason src/table.ts gives.
import './index';

export { mathExtension, type MathOptions } from './extensions/math/math-extension';
export type { RenderMath } from './extensions/math/math-feature';
export { englishMathLabels, type MathLabels } from './extensions/math/math-labels';
