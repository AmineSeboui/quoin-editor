import css from '../ui/tokens.css?raw';
import linksCss from './static-links.css?raw';
import diffCss from '../diff/diff.css?raw';
import stylesCss from '../styles.css?raw';
import { contrastRatio, tokenReader, type Theme } from '../ui/oklch-contrast';

const token = tokenReader(css);
const uncommented = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the rule whose selector list is exactly `selectors`. */
function ruleOf(source: string, selectors: readonly string[]): string {
  const rule = uncommented(source)
    .split('}')
    .find((chunk) => chunk.split('{')[0].split(',').map((selector) => selector.trim()).join('|') === selectors.join('|'));
  if (!rule) throw new Error(`no rule for ${selectors.join(', ')}`);
  return rule.split('{')[1];
}

const LINK = /color:\s*var\(--quoin-([\w-]+)\)/.exec(ruleOf(linksCss, ['.quoin-view a[href]', '.quoin-diff a[href]']))?.[1] ?? '';

describe.each<Theme>(['light', 'dark'])('static links in the %s theme', (theme) => {
  it('are written at 4.5:1 or more on the page', () => {
    expect(contrastRatio(token(theme, LINK), token(theme, 'background'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the stylesheet of static links', () => {
  it('colours the links of the view and the diff with the link token, and ships with the stylesheet', () => {
    expect(LINK).toBe('link');
    expect(stylesCss).toContain('@import "./view-static/static-links.css" layer(quoin.components);');
  });

  it('lets a link inside inserted or deleted words take their colour, whose contrast the diff tests', () => {
    expect(ruleOf(diffCss, ['.quoin-diff ins a[href]', '.quoin-diff del a[href]'])).toMatch(/color:\s*inherit/);
  });
});
