import { englishLabels } from './english-labels';
import type { QuoinLabels } from './labels';
import { resolveLabels } from './resolve-labels';

const KEYS = Object.keys(englishLabels) as (keyof QuoinLabels)[];

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

  it('takes the entries a host renames inside a record and keeps English for the rest of it', () => {
    const labels = resolveLabels({ groups: { lists: 'Listen' } as QuoinLabels['groups'] });
    expect(labels.groups.lists).toBe('Listen');
    expect(labels.groups.basic).toBe(englishLabels.groups.basic);
    expect(Object.keys(labels.groups).sort()).toEqual(Object.keys(englishLabels.groups).sort());
  });

  it('leaves the English labels untouched', () => {
    resolveLabels({ bold: 'Gras' });
    expect(englishLabels.bold).toBe('Bold');
  });
});
