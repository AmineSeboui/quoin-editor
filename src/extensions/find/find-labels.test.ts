import { englishFindLabels, resolveFindLabels } from './find-labels';

describe('the find labels', () => {
  it('are English by default', () => {
    const labels = resolveFindLabels();
    expect(labels).toBe(englishFindLabels);
    expect(labels.findAndReplace).toBe('Find and replace');
    expect(labels.find).toBe('Find');
    expect(labels.replaceWith).toBe('Replace with');
    expect([labels.matchCase, labels.wholeWord, labels.regularExpression]).toEqual([
      'Match case',
      'Whole word',
      'Regular expression',
    ]);
    expect([labels.previousMatch, labels.nextMatch, labels.close]).toEqual(['Previous match', 'Next match', 'Close']);
    expect([labels.replace, labels.replaceAll]).toEqual(['Replace', 'Replace all']);
    expect(labels.noResults).toBe('No results');
    expect(labels.invalidPattern).toBe('Invalid regular expression');
  });

  it('count the matches with thousands grouped, and a plus past the ones counted', () => {
    expect(englishFindLabels.matchCount(3, 12, false)).toBe('3 of 12');
    expect(englishFindLabels.matchCount(1200, 1000, false)).toBe('1,200 of 1,000');
    expect(englishFindLabels.matchCount(1, 1000, true)).toBe('1 of 1,000+');
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const labels = resolveFindLabels({ find: 'Rechercher', replace: undefined });
    expect(labels.find).toBe('Rechercher');
    expect(labels.replace).toBe('Replace');
    expect(resolveFindLabels({ close: undefined })).toBe(englishFindLabels);
  });

  it('name every part with a non-empty string', () => {
    const { matchCount, ...strings } = englishFindLabels;
    expect(Object.values(strings).every((value) => value.trim() !== '')).toBe(true);
    expect(matchCount(0, 0, false).trim()).not.toBe('');
  });
});
