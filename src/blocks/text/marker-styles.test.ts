import { bulletGlyph, orderedLabel } from './marker-styles';

describe('bulletGlyph', () => {
  it('cycles a disc, a circle and a square with the depth', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(bulletGlyph)).toEqual([
      '\u2022',
      '\u25E6',
      '\u25AA',
      '\u2022',
      '\u25E6',
      '\u25AA',
      '\u2022',
    ]);
  });
});

describe('orderedLabel', () => {
  it('counts in decimal, then lower alpha, then lower roman, and cycles with the depth', () => {
    expect([0, 1, 2, 3].map((depth) => orderedLabel(4, depth))).toEqual(['4.', 'd.', 'iv.', '4.']);
  });

  it('carries lower alpha past z the way a list does', () => {
    expect([1, 26, 27, 52, 53, 702, 703].map((n) => orderedLabel(n, 1))).toEqual([
      'a.',
      'z.',
      'aa.',
      'az.',
      'ba.',
      'zz.',
      'aaa.',
    ]);
  });

  it('writes lower roman numerals with subtractive pairs', () => {
    expect([1, 4, 9, 14, 40, 90, 400, 1994, 3999].map((n) => orderedLabel(n, 2))).toEqual([
      'i.',
      'iv.',
      'ix.',
      'xiv.',
      'xl.',
      'xc.',
      'cd.',
      'mcmxciv.',
      'mmmcmxcix.',
    ]);
  });

  it('falls back to decimal where letters and numerals have no form, as a list does', () => {
    expect(orderedLabel(0, 1)).toBe('0.');
    expect(orderedLabel(0, 2)).toBe('0.');
    expect(orderedLabel(4000, 2)).toBe('4000.');
  });
});
