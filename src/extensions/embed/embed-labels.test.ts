import { englishEmbedLabels, resolveEmbedLabels } from './embed-labels';

describe('the embed labels', () => {
  it('are English by default, naming every built-in provider in the title of its frame', () => {
    const labels = resolveEmbedLabels();
    expect(labels).toBe(englishEmbedLabels);
    expect(
      ['youtube', 'vimeo', 'loom', 'figma', 'codepen', 'spotify', 'soundcloud'].map((name) => labels.frameTitle(name)),
    ).toEqual([
      'YouTube video',
      'Vimeo video',
      'Loom video',
      'Figma design',
      'CodePen pen',
      'Spotify player',
      'SoundCloud player',
    ]);
    expect(labels.frameTitle('acme')).toBe('acme embed');
    expect([labels.embed, labels.bookmark, labels.keepAsLink]).toEqual(['Embed', 'Bookmark', 'Keep as link']);
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const frameTitle = (name: string) => `Lecteur ${name}`;
    const labels = resolveEmbedLabels({ embed: 'Int\u00e9grer', bookmark: undefined, frameTitle });
    expect(labels.embed).toBe('Int\u00e9grer');
    expect(labels.frameTitle('youtube')).toBe('Lecteur youtube');
    expect(labels.bookmark).toBe('Bookmark');
    expect(resolveEmbedLabels({ embed: undefined })).toBe(englishEmbedLabels);
  });

  it('name every control with a non-empty string', () => {
    const values = Object.values(englishEmbedLabels).map((value) => (typeof value === 'function' ? value('x') : value));
    expect(values.every((value) => typeof value === 'string' && value.trim() !== '')).toBe(true);
  });
});
