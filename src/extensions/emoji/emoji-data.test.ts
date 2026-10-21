import { emojiData, loadEmojiData } from './emoji-data';

describe('loadEmojiData', () => {
  it('loads the dataset once, as its search, its shortcode lookup and the skin tones', async () => {
    const first = loadEmojiData();
    expect(loadEmojiData()).toBe(first);
    const data = await first;
    expect(Object.keys(data).sort()).toEqual(['emojiByShortcode', 'searchEmoji', 'skinTones']);
    expect(data.searchEmoji('tada', 1).map(({ emoji }) => emoji)).toEqual(['\u{1F389}']);
    expect(data.emojiByShortcode('tada')?.emoji).toBe('\u{1F389}');
    expect(data.skinTones).toHaveLength(5);
    expect(emojiData.loaded()).toBe(data);
  });
});
