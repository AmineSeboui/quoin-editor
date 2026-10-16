import { englishLabels, resolveLabels, type QuoinLabels } from './labels';

const KEYS = Object.keys(englishLabels) as (keyof QuoinLabels)[];

function sampleText(label: QuoinLabels[keyof QuoinLabels]): string[] {
  if (typeof label === 'string') return [label];
  if (typeof label === 'function') return [(label as (...args: unknown[]) => string)(2, 5)];
  return Object.values(label);
}

describe('resolveLabels', () => {
  it('is the English labels when the host overrides nothing', () => {
    expect(resolveLabels()).toEqual(englishLabels);
    expect(resolveLabels({})).toEqual(englishLabels);
  });

  it('takes the label a host overrides and keeps English for every other key', () => {
    const labels = resolveLabels({ bold: 'Gras' });
    expect(labels.bold).toBe('Gras');
    for (const key of KEYS.filter((name) => name !== 'bold')) expect(labels[key]).toBe(englishLabels[key]);
  });

  it('keeps English for a key the host passes as undefined', () => {
    expect(resolveLabels({ bold: undefined }).bold).toBe('Bold');
  });

  it('takes a worded label as a function of its value', () => {
    const labels = resolveLabels({ heading: (level) => `Titre ${level}` });
    expect(labels.heading(2)).toBe('Titre 2');
    expect(labels.numberedItem(3)).toBe('Numbered list item 3');
  });

  it('leaves the English labels untouched', () => {
    resolveLabels({ bold: 'Gras' });
    expect(englishLabels.bold).toBe('Bold');
  });
});

describe('englishLabels', () => {
  it('words the labels the editor already speaks', () => {
    expect(englishLabels.document).toBe('Editor');
    expect(englishLabels.editorHint).toBe('Press Escape, then Tab, to leave the editor.');
    expect(englishLabels.heading(2)).toBe('Heading 2');
    expect(englishLabels.callout('warning')).toBe('Callout, warning');
    expect(englishLabels.paragraph).toBe('Paragraph');
    expect(englishLabels.selectedContent).toBe('Selected content');
    expect(englishLabels.close).toBe('Close');
  });

  it('names the Edit button of void blocks and the blocks no definition draws', () => {
    expect(englishLabels.editBlock('Bookmark')).toBe('Edit Bookmark');
    expect(englishLabels.unsupportedBlock).toBe('Unsupported block');
  });

  it('counts one selected block in the singular and more in the plural', () => {
    expect(englishLabels.blocksSelected(1)).toBe('1 block selected');
    expect(englishLabels.blocksSelected(3)).toBe('3 blocks selected');
  });

  it('names every palette colour and every slash menu group', () => {
    expect(Object.keys(englishLabels.colors)).toHaveLength(10);
    expect(Object.keys(englishLabels.groups)).toHaveLength(7);
  });

  it('writes no empty label and no em or en dash', () => {
    for (const text of KEYS.flatMap((key) => sampleText(englishLabels[key]))) {
      expect(text.trim()).not.toBe('');
      expect(text).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
