import { mergeLabels } from './merge-labels';

const defaults = { bold: 'Bold', italic: 'Italic', heading: (level: number) => `Heading ${level}` };

describe('mergeLabels', () => {
  it('is the defaults themselves when nothing is overridden', () => {
    expect(mergeLabels(defaults)).toBe(defaults);
    expect(mergeLabels(defaults, {})).toBe(defaults);
    expect(mergeLabels(defaults, { bold: undefined })).toBe(defaults);
  });

  it('takes the keys given and keeps the default for every other', () => {
    const labels = mergeLabels(defaults, { bold: 'Gras', heading: (level) => `Titre ${level}` });
    expect(labels.bold).toBe('Gras');
    expect(labels.heading(2)).toBe('Titre 2');
    expect(labels.italic).toBe('Italic');
  });

  it('keeps the default for a key passed as undefined beside one given', () => {
    expect(mergeLabels(defaults, { bold: 'Gras', italic: undefined }).italic).toBe('Italic');
  });

  it('leaves the defaults untouched', () => {
    mergeLabels(defaults, { bold: 'Gras' });
    expect(defaults.bold).toBe('Bold');
  });
});
