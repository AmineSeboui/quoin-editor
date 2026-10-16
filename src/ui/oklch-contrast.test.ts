import { contrastRatio, tokenReader } from './oklch-contrast';

describe('contrastRatio', () => {
  it('measures black on white as 21:1', () => {
    expect(contrastRatio([0, 0, 0], [1, 0, 0])).toBeCloseTo(21, 5);
  });

  it('measures mid grey on white as the published 4.74:1', () => {
    expect(contrastRatio([0.556, 0, 0], [1, 0, 0])).toBeCloseTo(4.74, 1);
  });

  it('clips a colour outside sRGB the way a browser paints it', () => {
    expect(contrastRatio([1, 0.4, 145], [1, 0, 0])).toBeLessThan(21);
    expect(contrastRatio([1, 0.4, 145], [1, 0, 0])).toBeGreaterThanOrEqual(1);
  });
});

describe('tokenReader', () => {
  const css = `
    :root { --quoin-ink: oklch(0.2 0.01 250); --quoin-glass: oklch(1 0 0 / 10%); /* --quoin-ghost: oklch(1 0 0); */ }
    .dark { --quoin-ink: oklch(0.9 0 0); }
  `;
  const token = tokenReader(css);

  it('reads an opaque oklch token from the light and the dark rule', () => {
    expect(token('light', 'ink')).toEqual([0.2, 0.01, 250]);
    expect(token('dark', 'ink')).toEqual([0.9, 0, 0]);
  });

  it('refuses a translucent token, a commented one and a missing one', () => {
    expect(() => token('light', 'glass')).toThrow('--quoin-glass');
    expect(() => token('light', 'ghost')).toThrow('--quoin-ghost');
    expect(() => token('dark', 'glass')).toThrow('dark theme');
  });

  it('refuses a stylesheet without both theme rules', () => {
    expect(() => tokenReader(':root { --quoin-ink: oklch(0 0 0); }')).toThrow('.dark');
  });
});
