/** Every string the math feature shows or speaks. */
export type MathLabels = {
  /** The name of a math block. */
  equation: string;
  /** What a block or an inline formula with no LaTeX shows. */
  emptyEquation: string;
  /** The popover that edits a formula. */
  editEquation: string;
  /** The field that holds a formula's LaTeX. */
  latex: string;
  /** The live preview of the formula being edited. */
  preview: string;
  save: string;
  /** The slash command that inserts a math block. */
  blockEquation: string;
  blockEquationDescription: string;
  /** The slash command that writes a formula at the caret. */
  inlineEquation: string;
  inlineEquationDescription: string;
};

export const englishMathLabels: MathLabels = {
  equation: 'Equation',
  emptyEquation: 'Empty equation',
  editEquation: 'Edit equation',
  latex: 'LaTeX',
  preview: 'Preview',
  save: 'Save',
  blockEquation: 'Block equation',
  blockEquationDescription: 'A formula on a line of its own',
  inlineEquation: 'Inline equation',
  inlineEquationDescription: 'A formula in the line of text',
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveMathLabels(overrides?: Partial<MathLabels>): MathLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishMathLabels : { ...englishMathLabels, ...Object.fromEntries(given) };
}
