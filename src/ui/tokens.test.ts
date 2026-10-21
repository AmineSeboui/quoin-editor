import css from './tokens.css?raw';
import viewCss from '../view/view.css?raw';
import stylesCss from '../styles.css?raw';
import inputSource from './input.tsx?raw';
import { TONE } from '../blocks/previews';
import { PALETTE } from '../engine/markdown/palette';
import { contrastOnWash, contrastRatio, tokenReader, type Theme } from './oklch-contrast';

const token = tokenReader(css);
const contrast = (theme: Theme, a: string, b: string) => contrastRatio(token(theme, a), token(theme, b));

/** The token a rule of the view's stylesheet paints a property with. */
function paintedWith(selector: string, property: string): string {
  const rule = viewCss.split('}').find((chunk) => chunk.split('{')[0].trim() === selector);
  const value = rule?.split('{')[1].match(new RegExp(`(?:^|;)\\s*${property}:[^;]*var\\(--quoin-([\\w-]+)\\)`));
  if (!value) throw new Error(`no ${property} token in the rule ${selector}`);
  return value[1];
}

const TASK_BOX = paintedWith('.quoin .quoin-task-box', 'border');
const PLACEHOLDER = paintedWith('.quoin [data-placeholder]:has(> br[data-quoin-filler]:only-child)::before', 'color');

/** The token and the opacity of each callout tone's wash. */
const WASHES = Object.values(TONE).map((classes) => {
  const [, name, percent] = /\bbg-([\w-]+)\/(\d+)/.exec(classes)!;
  return { name, alpha: Number(percent) / 100 };
});

const SURFACES = ['background', 'accent', ...PALETTE.map((name) => `bg-${name}`)];

/** The token behind the border colour a field's classes give it with no state or variant in front. */
function fieldBorder(source: string): string {
  const [, colour] = /["\s]border-([a-z][\w-]*)[\s"]/.exec(source) ?? [];
  const [, token] = new RegExp(`--color-${colour}:\\s*var\\(--quoin-([\\w-]+)\\)`).exec(stylesCss) ?? [];
  if (!token) throw new Error(`no token behind border-${colour}`);
  return token;
}

const FIELD_BORDERS = [{ field: 'input', token: fieldBorder(inputSource) }];

const FIELD_SURFACES = ['background', 'popover', 'accent'];

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

  it('draws an unchecked task box at 3:1 or more on the page, a selected block and every background colour', () => {
    for (const surface of SURFACES) expect(contrast(theme, TASK_BOX, surface)).toBeGreaterThanOrEqual(3);
  });

  it.each(FIELD_BORDERS)('draws a $field border at 3:1 or more on the page, a popover or a selected block', (field) => {
    for (const surface of FIELD_SURFACES) expect(contrast(theme, field.token, surface)).toBeGreaterThanOrEqual(3);
  });

  it('writes a placeholder at 4.5:1 or more on the page, a selected block and every background colour', () => {
    for (const surface of SURFACES) expect(contrast(theme, PLACEHOLDER, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(WASHES)('writes a placeholder at 4.5:1 or more on the $name wash of a callout', ({ name, alpha }) => {
    const ratio = contrastOnWash(token(theme, PLACEHOLDER), token(theme, name), alpha, token(theme, 'background'));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
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
