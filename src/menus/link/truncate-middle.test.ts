import { describe, expect, it } from 'vitest';
import { truncateMiddle } from './truncate-middle';

describe('truncateMiddle', () => {
  it('keeps text that fits', () => {
    expect(truncateMiddle('https://quoin.dev', 48)).toBe('https://quoin.dev');
    expect(truncateMiddle('x'.repeat(48), 48)).toBe('x'.repeat(48));
  });

  it('cuts the middle of longer text to the length, keeping both ends', () => {
    const url = `https://example.com/${'a'.repeat(40)}/end.html`;
    const cut = truncateMiddle(url, 48);
    expect([...cut]).toHaveLength(48);
    expect(cut).toBe(`${url.slice(0, 24)}…${url.slice(-23)}`);
  });

  it('never splits a character outside the basic plane', () => {
    const cut = truncateMiddle('\u{1F600}'.repeat(10), 5);
    expect(cut).toBe('\u{1F600}\u{1F600}…\u{1F600}\u{1F600}');
  });
});
