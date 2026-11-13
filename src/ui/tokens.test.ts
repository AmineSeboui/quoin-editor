import css from './tokens.css?raw';
import viewCss from '../view/view.css?raw';
import commentsCss from '../extensions/comments/comments.css?raw';
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

/** What a callout's wash is laid over: the page, or a selected block. Never a background colour, which only text takes. */
const CALLOUT_SURFACES = ['background', 'accent'];

/** How opaque the comments stylesheet paints the tint of an anchor. */
const ANCHOR_TINT = /\[data-comment\] \{\s*background: color-mix\(in oklch, var\(--quoin-comment\) (\d+)%/;
const ANCHOR_ALPHA = Number(ANCHOR_TINT.exec(commentsCss)![1]) / 100;

/** The surface behind a highlighted row in a menu, a select and the palette. */
const HIGHLIGHT = 'accent';

/** The syntax colours, read from the palette so one added later is held to the same contrast. */
const SYNTAX = [...new Set([...css.matchAll(/--quoin-(syntax-[\w-]+):/g)].map(([, name]) => name))];

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

  it.each(PALETTE)('draws the focus ring at 3:1 or more against the %s background a block can be coloured', (name) => {
    expect(contrast(theme, 'ring', `bg-${name}`)).toBeGreaterThanOrEqual(3);
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

  it.each(SYNTAX)('keeps %s at 4.5:1 or more on the code block it is drawn on', (name) => {
    expect(contrast(theme, name, 'muted')).toBeGreaterThanOrEqual(4.5);
  });

  it('names a syntax colour for each of the six groups the code stylesheet paints', () => {
    expect(SYNTAX).toHaveLength(6);
  });

  it('draws an unchecked task box at 3:1 or more on the page, a selected block and every background colour', () => {
    for (const surface of SURFACES) expect(contrast(theme, TASK_BOX, surface)).toBeGreaterThanOrEqual(3);
  });

  it('draws the rule of a warning callout at 3:1 or more on its wash and on the page', () => {
    const wash = WASHES.find((w) => w.name === 'warning')!;
    const [rule, page] = [token(theme, 'warning'), token(theme, 'background')];
    expect(contrastOnWash(rule, rule, wash.alpha, page)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(rule, page)).toBeGreaterThanOrEqual(3);
  });

  it('writes a placeholder at 4.5:1 or more on the page, a selected block and every background colour', () => {
    for (const surface of SURFACES) expect(contrast(theme, PLACEHOLDER, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(WASHES)('writes a placeholder at 4.5:1 or more on the $name wash of a callout, selected or not', ({ name, alpha }) => {
    for (const under of CALLOUT_SURFACES) {
      const ratio = contrastOnWash(token(theme, PLACEHOLDER), token(theme, name), alpha, token(theme, under));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps body text at 4.5:1 or more on a comment anchor, on two stacked, and on the active one', () => {
    const [text, wash, page] = [token(theme, 'foreground'), token(theme, 'comment'), token(theme, 'background')];
    expect(contrastOnWash(text, wash, ANCHOR_ALPHA, page)).toBeGreaterThanOrEqual(4.5);
    expect(contrastOnWash(text, wash, 1 - (1 - ANCHOR_ALPHA) ** 2, page)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme, 'foreground', 'comment-active')).toBeGreaterThanOrEqual(4.5);
  });

  it.each([...PALETTE.map((name) => `color-${name}`), 'muted-foreground'])(
    'writes %s text at 4.5:1 or more on a comment anchor, on two stacked, and on the active one',
    (name) => {
      const [text, wash, page] = [token(theme, name), token(theme, 'comment'), token(theme, 'background')];
      expect(contrastOnWash(text, wash, ANCHOR_ALPHA, page)).toBeGreaterThanOrEqual(4.5);
      expect(contrastOnWash(text, wash, 1 - (1 - ANCHOR_ALPHA) ** 2, page)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme, name, 'comment-active')).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('draws the active anchor stronger than the others, and two stacked anchors stronger than one', () => {
    const [wash, page] = [token(theme, 'comment'), token(theme, 'background')];
    const one = contrastOnWash(page, wash, ANCHOR_ALPHA, page);
    expect(contrastOnWash(page, wash, 1 - (1 - ANCHOR_ALPHA) ** 2, page)).toBeGreaterThan(one);
    expect(contrast(theme, 'comment-active', 'background')).toBeGreaterThan(one);
  });

  it('draws the rule under comment anchors at 3:1 or more against the page and the tints', () => {
    expect(contrast(theme, 'comment-edge', 'background')).toBeGreaterThanOrEqual(3);
    expect(contrast(theme, 'comment-edge', 'comment-active')).toBeGreaterThanOrEqual(3);
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
