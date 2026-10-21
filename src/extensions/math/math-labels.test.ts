import { englishMathLabels, resolveMathLabels } from './math-labels';

describe('the math labels', () => {
  it('are English by default', () => {
    const labels = resolveMathLabels();
    expect(labels).toBe(englishMathLabels);
    expect(labels).toEqual({
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
    });
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const labels = resolveMathLabels({ equation: '\u00c9quation', save: undefined });
    expect(labels.equation).toBe('\u00c9quation');
    expect(labels.save).toBe('Save');
    expect(resolveMathLabels({ latex: undefined })).toBe(englishMathLabels);
  });

  it('name every control with a non-empty string', () => {
    expect(Object.values(englishMathLabels).every((value) => value.trim() !== '')).toBe(true);
  });
});
