// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { EMOJI_DATA_FILE, emojibase, emojiRows, generateEmojiData } from './emoji-data.mjs';

const root = resolve(__dirname, '..');
const GROUPS = ['smileys', 'people', 'animals', 'food', 'travel', 'activities', 'objects', 'symbols', 'flags'];
const SKIN_TONE = /[\u{1F3FB}-\u{1F3FF}]/u;
const MAX_GZIP = 60_000;

describe('the emoji rows', () => {
  it('keep each emoji of a group as [emoji, shortcodes, tags, group], without its skin tones or components', () => {
    const compact = [
      { hexcode: '1F389', unicode: '\u{1F389}', label: 'party popper', group: 6, order: 1, tags: ['party', 'tada'] },
      {
        hexcode: '1F44B',
        unicode: '\u{1F44B}',
        label: 'waving hand',
        group: 1,
        order: 2,
        tags: ['wave'],
        skins: [{ hexcode: '1F44B-1F3FB', unicode: '\u{1F44B}\u{1F3FB}', tone: 1 }],
      },
      { hexcode: '1F3FB', unicode: '\u{1F3FB}', label: 'light skin tone', group: 2, order: 3, tags: ['light'] },
      { hexcode: '1F1E6', unicode: '\u{1F1E6}', label: 'regional indicator A' },
      { hexcode: '1FAE8', unicode: '\u{1FAE8}', label: 'shaking face', group: 0, order: 4, tags: ['shock'] },
    ];
    const shortcodes = { '1F389': 'tada', '1F44B': ['wave', 'waving_hand'], '1F3FB': 'skin-tone-2' };
    expect(emojiRows(compact, shortcodes)).toEqual([
      ['\u{1F389}', ['tada'], ['party', 'tada'], 'activities'],
      ['\u{1F44B}', ['wave', 'waving_hand'], ['wave'], 'people'],
      ['\u{1FAE8}', [], ['shock'], 'smileys'],
    ]);
  });
});

describe('the emoji data of the installed emojibase-data', () => {
  const { compact, shortcodes } = emojibase(root);
  const rows: [string, string[], string[], string][] = emojiRows(compact, shortcodes);

  it('is the committed data module, which npm run build:emoji writes', () => {
    expect(readFileSync(resolve(root, EMOJI_DATA_FILE), 'utf8')).toBe(generateEmojiData(root));
  });

  it('holds about 1,900 emoji, each once, in its base form, with a group and a name to call it by', () => {
    expect(rows.length).toBeGreaterThan(1_850);
    expect(rows.length).toBeLessThan(1_950);
    expect(new Set(rows.map(([emoji]) => emoji)).size).toBe(rows.length);
    for (const [emoji, codes, tags, group] of rows) {
      expect(emoji).not.toMatch(SKIN_TONE);
      expect([...codes, ...tags].every((word) => typeof word === 'string' && word !== '')).toBe(true);
      expect(codes.length + tags.length).toBeGreaterThan(0);
      expect(GROUPS).toContain(group);
    }
    expect(rows.find(([emoji]) => emoji === '\u{1F389}')).toEqual(['\u{1F389}', ['tada'], expect.any(Array), 'activities']);
  });

  it('keeps the groups in the order the picker shows them', () => {
    expect([...new Set(rows.map(([, , , group]) => group))]).toEqual(GROUPS);
  });

  it('writes a module under 60 KB gzip', () => {
    expect(gzipSync(generateEmojiData(root)).length).toBeLessThan(MAX_GZIP);
  });
});
