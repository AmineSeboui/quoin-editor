import { englishStatsLabels, resolveStatsLabels } from './stats-labels';

describe('the stats labels', () => {
  it('are English by default, singular for one and plural otherwise', () => {
    const labels = resolveStatsLabels();
    expect(labels).toBe(englishStatsLabels);
    expect([labels.characters(1), labels.characters(0), labels.characters(12)]).toEqual([
      '1 character',
      '0 characters',
      '12 characters',
    ]);
    expect([labels.words(1), labels.words(2)]).toEqual(['1 word', '2 words']);
    expect([labels.blocks(1), labels.blocks(3)]).toEqual(['1 block', '3 blocks']);
  });

  it('group thousands, and show the count against the limit', () => {
    expect(englishStatsLabels.characters(12345)).toBe('12,345 characters');
    expect(englishStatsLabels.characterLimit(950, 1000)).toBe('950 / 1,000 characters');
    expect(englishStatsLabels.characterLimit(1, 1)).toBe('1 / 1 character');
    expect(englishStatsLabels.limitReached(1000)).toBe('Character limit of 1,000 reached');
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const words = (count: number) => `${count} mots`;
    const labels = resolveStatsLabels({ words, blocks: undefined });
    expect(labels.words(2)).toBe('2 mots');
    expect(labels.blocks(2)).toBe('2 blocks');
    expect(resolveStatsLabels({ characters: undefined })).toBe(englishStatsLabels);
  });

  it('say something for every count', () => {
    const { characterLimit, limitReached, ...counts } = englishStatsLabels;
    expect(Object.values(counts).every((count) => count(0).trim() !== '')).toBe(true);
    expect(characterLimit(0, 0).trim()).not.toBe('');
    expect(limitReached(0).trim()).not.toBe('');
  });
});
