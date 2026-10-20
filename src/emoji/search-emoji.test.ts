import type { Emoji } from './emoji-types';
import { emojiByShortcode, searchEmoji, skinTones } from './index';

const SMILEY = '\u{1F603}';
const SMILE = '\u{1F604}';
const PARTY_POPPER = '\u{1F389}';
const THUMBS_UP = '\u{1F44D}\uFE0F';

const glyphs = (found: readonly Emoji[]) => found.map(({ emoji }) => emoji);

// 0 for a shortcode that is the query, 1 for one that starts with it, 2 for a tag that does, 3 for a word holding it.
function matchOf({ shortcodes, tags }: Emoji, query: string): number {
  if (shortcodes.includes(query)) return 0;
  if (shortcodes.some((code) => code.startsWith(query))) return 1;
  if (tags.some((tag) => tag.startsWith(query))) return 2;
  return [...shortcodes, ...tags].some((word) => word.includes(query)) ? 3 : 4;
}

describe('searchEmoji', () => {
  it('finds the smiles first for smi', () => {
    const found = searchEmoji('smi', 5);
    expect(glyphs(found).slice(0, 2)).toEqual([SMILEY, SMILE]);
    expect(found.every(({ shortcodes }) => shortcodes.some((code) => code.startsWith('smi')))).toBe(true);
  });

  it('ranks a shortcode that is the query, then one that starts with it, then a tag that does, then any word that holds it', () => {
    for (const query of ['smi', 'cat', 'heart', 'sun', 'ok']) {
      const matches = searchEmoji(query).map((emoji) => matchOf(emoji, query));
      expect(matches.length).toBeGreaterThan(1);
      expect(matches).toEqual([...matches].sort((a, b) => a - b));
      expect(matches.includes(4)).toBe(false);
    }
    expect(glyphs(searchEmoji('smile', 1))).toEqual([SMILE]);
  });

  it('puts the party popper first for tada, whatever the case and the spaces around the query', () => {
    expect(glyphs(searchEmoji('tada', 1))).toEqual([PARTY_POPPER]);
    expect(glyphs(searchEmoji(' TaDa ', 1))).toEqual([PARTY_POPPER]);
  });

  it('keeps to the limit, and finds nothing for a query no word holds', () => {
    expect(searchEmoji('face', 8)).toHaveLength(8);
    expect(searchEmoji('face', 0)).toEqual([]);
    expect(searchEmoji('zzqx')).toEqual([]);
  });

  it('finds every emoji of the dataset for an empty query, grouped in the order of the picker', () => {
    const all = searchEmoji('');
    expect(all.length).toBeGreaterThan(1_850);
    expect([...new Set(all.map(({ group }) => group))]).toEqual([
      'smileys',
      'people',
      'animals',
      'food',
      'travel',
      'activities',
      'objects',
      'symbols',
      'flags',
    ]);
    expect(searchEmoji('  ', 3)).toEqual(all.slice(0, 3));
  });
});

describe('emojiByShortcode', () => {
  it('finds the emoji of a shortcode, any of its own, whatever the case', () => {
    expect(emojiByShortcode('tada')).toMatchObject({ emoji: PARTY_POPPER, group: 'activities' });
    expect(emojiByShortcode('+1')?.emoji).toBe(THUMBS_UP);
    expect(emojiByShortcode('thumbsup')?.emoji).toBe(THUMBS_UP);
    expect(emojiByShortcode('TADA')?.emoji).toBe(PARTY_POPPER);
  });

  it('finds nothing for a word that is no shortcode', () => {
    expect(emojiByShortcode('tad')).toBeUndefined();
    expect(emojiByShortcode('')).toBeUndefined();
    expect(emojiByShortcode('constructor')).toBeUndefined();
  });
});

describe('skinTones', () => {
  it('are the five skin tone modifiers, light to dark', () => {
    expect(skinTones).toEqual(['\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}']);
  });
});
