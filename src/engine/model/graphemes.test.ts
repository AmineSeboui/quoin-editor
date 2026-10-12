import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextGraphemeOffset, nextWordOffset, prevGraphemeOffset, prevWordOffset } from './graphemes';

describe('graphemes', () => {
  it('steps over surrogate pairs and combining sequences as one', () => {
    const s = 'a👍🏽b';
    expect(nextGraphemeOffset(s, 1)).toBe(5);
    expect(prevGraphemeOffset(s, 5)).toBe(1);
    expect(nextGraphemeOffset('e\u0301', 0)).toBe(2);
  });

  it('clamps at the ends', () => {
    expect(nextGraphemeOffset('ab', 2)).toBe(2);
    expect(prevGraphemeOffset('ab', 0)).toBe(0);
  });

  it('moves by words, skipping whitespace and punctuation first', () => {
    const s = 'hello, big world';
    expect(nextWordOffset(s, 0)).toBe(5);
    expect(nextWordOffset(s, 5)).toBe(10);
    expect(prevWordOffset(s, 16)).toBe(11);
    expect(prevWordOffset(s, 11)).toBe(7);
  });

  it('stops at the ends when no word remains', () => {
    expect(nextWordOffset('word, ', 4)).toBe(6);
    expect(prevWordOffset(' word', 1)).toBe(0);
  });
});

describe('graphemes without Intl.Segmenter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function loadFallback() {
    vi.stubGlobal('Intl', Object.create(Intl, { Segmenter: { value: undefined } }));
    vi.resetModules();
    return import('./graphemes');
  }

  it('falls back to code points', async () => {
    const fallback = await loadFallback();
    const s = 'a👍🏽b';
    expect(fallback.nextGraphemeOffset(s, 1)).toBe(3);
    expect(fallback.prevGraphemeOffset(s, 5)).toBe(3);
    expect(fallback.nextGraphemeOffset(s, 6)).toBe(6);
  });

  it('falls back to runs of letters, digits and underscores for words', async () => {
    const fallback = await loadFallback();
    const s = 'h\u00E9llo, big_2 world';
    expect(fallback.nextWordOffset(s, 0)).toBe(5);
    expect(fallback.nextWordOffset(s, 5)).toBe(12);
    expect(fallback.prevWordOffset(s, 12)).toBe(7);
    expect(fallback.prevWordOffset(s, 0)).toBe(0);
    expect(fallback.nextWordOffset(s, 18)).toBe(18);
  });
});
