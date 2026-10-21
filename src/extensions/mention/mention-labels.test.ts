import { englishMentionLabels, resolveMentionLabels } from './mention-labels';

describe('the mention labels', () => {
  it('are English by default', () => {
    const labels = resolveMentionLabels();
    expect(labels).toBe(englishMentionLabels);
    expect(labels.mentionMenu).toBe('Mentions');
    expect(labels.searching).toBe('Searching\u2026');
    expect(labels.noMatches).toBe('No matches');
    expect(labels.mentionDescription(undefined)).toBe('Mention');
    expect(labels.mentionDescription('user')).toBe('Mention, user');
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const labels = resolveMentionLabels({ noMatches: 'Aucun r\u00e9sultat', searching: undefined });
    expect(labels.noMatches).toBe('Aucun r\u00e9sultat');
    expect(labels.searching).toBe('Searching\u2026');
    expect(resolveMentionLabels({ mentionMenu: undefined })).toBe(englishMentionLabels);
  });

  it('name every part with a non-empty string', () => {
    const { mentionDescription, ...strings } = englishMentionLabels;
    expect(Object.values(strings).every((value) => value.trim() !== '')).toBe(true);
    expect(mentionDescription('page').trim()).not.toBe('');
  });
});
