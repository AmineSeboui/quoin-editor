import css from './tokens.css?raw';
import { PALETTE } from '../engine/markdown/palette';
import { contrastRatio, tokenReader, type Theme } from './oklch-contrast';

const token = tokenReader(css);
const contrast = (theme: Theme, a: string, b: string) => contrastRatio(token(theme, a), token(theme, b));

/** The surface behind a highlighted row in a menu, a select and the palette. */
const HIGHLIGHT = 'accent';

describe.each<Theme>(['light', 'dark'])('%s theme', (theme) => {
  it('draws the focus ring at 3:1 or more against the page', () => {
    expect(contrast(theme, 'ring', 'background')).toBeGreaterThanOrEqual(3);
  });

  it('draws the focus ring at 3:1 or more against a popover', () => {
    expect(contrast(theme, 'ring', 'popover')).toBeGreaterThanOrEqual(3);
  });

  it('draws the focus ring at 3:1 or more against a selected block and a callout, the colours it sits next to', () => {
    expect(contrast(theme, 'ring', 'accent')).toBeGreaterThanOrEqual(3);
    expect(contrast(theme, 'ring', 'muted')).toBeGreaterThanOrEqual(3);
  });

  it('keeps body text at 4.5:1 or more on the page and on a popover', () => {
    expect(contrast(theme, 'foreground', 'background')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme, 'popover-foreground', 'popover')).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps destructive text at 4.5:1 or more on a highlighted row', () => {
    expect(contrast(theme, 'destructive', HIGHLIGHT)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps muted text at 4.5:1 or more on a highlighted row', () => {
    expect(contrast(theme, 'muted-foreground', HIGHLIGHT)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps muted text at 4.5:1 or more on the page and on a popover', () => {
    expect(contrast(theme, 'muted-foreground', 'background')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme, 'muted-foreground', 'popover')).toBeGreaterThanOrEqual(4.5);
  });

  it('draws the highlight bar at 3:1 or more against the row and its popover', () => {
    expect(contrast(theme, 'foreground', HIGHLIGHT)).toBeGreaterThanOrEqual(3);
    expect(contrast(theme, 'foreground', 'popover')).toBeGreaterThanOrEqual(3);
  });
});

describe.each<Theme>(['light', 'dark'])('the %s palette', (theme) => {
  it.each(PALETTE)('writes %s text at 4.5:1 or more on the page', (name) => {
    expect(contrast(theme, `color-${name}`, 'background')).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PALETTE)('keeps body text at 4.5:1 or more on the %s background', (name) => {
    expect(contrast(theme, 'foreground', `bg-${name}`)).toBeGreaterThanOrEqual(4.5);
  });
});
