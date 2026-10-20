import { englishEmojiLabels, resolveEmojiLabels } from './emoji-labels';

describe('the emoji labels', () => {
  it('are English by default', () => {
    const labels = resolveEmojiLabels();
    expect(labels).toBe(englishEmojiLabels);
    expect(labels.emojiMenu).toBe('Emoji');
    expect(labels.loading).toBe('Loading emoji\u2026');
    expect(labels.loadFailed).toBe('Emoji could not be loaded');
    expect(labels.noMatches).toBe('No emoji found');
    expect(labels.chooseIcon).toBe('Choose icon');
    expect(labels.searchEmoji).toBe('Search emoji');
    expect(labels.searchResults).toBe('Search results');
    expect(labels.groups).toEqual({
      smileys: 'Smileys and emotion',
      people: 'People and body',
      animals: 'Animals and nature',
      food: 'Food and drink',
      travel: 'Travel and places',
      activities: 'Activities',
      objects: 'Objects',
      symbols: 'Symbols',
      flags: 'Flags',
    });
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const groups = { ...englishEmojiLabels.groups, flags: 'Drapeaux' };
    const labels = resolveEmojiLabels({ chooseIcon: "Choisir l'ic\u00f4ne", groups, loading: undefined });
    expect(labels.chooseIcon).toBe("Choisir l'ic\u00f4ne");
    expect(labels.groups.flags).toBe('Drapeaux');
    expect(labels.loading).toBe('Loading emoji\u2026');
    expect(resolveEmojiLabels({ emojiMenu: undefined })).toBe(englishEmojiLabels);
  });

  it('name every part with a non-empty string', () => {
    const { groups, ...strings } = englishEmojiLabels;
    expect([...Object.values(strings), ...Object.values(groups)].every((value) => value.trim() !== '')).toBe(true);
  });
});
