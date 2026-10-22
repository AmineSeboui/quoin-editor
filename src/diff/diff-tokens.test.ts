import css from '../ui/tokens.css?raw';
import diffCss from './diff.css?raw';
import stylesCss from '../styles.css?raw';
import { contrastRatio, tokenReader, type Theme } from '../ui/oklch-contrast';

const token = tokenReader(css);
const contrast = (theme: Theme, a: string, b: string) => contrastRatio(token(theme, a), token(theme, b));

/** The token a rule of the diff stylesheet paints a property with. */
function paintedWith(selector: string, property: string): string {
  const rule = diffCss.split('}').find((chunk) => chunk.split('{')[0].replace(/\/\*[\s\S]*?\*\//g, '').trim() === selector);
  const value = rule?.split('{')[1].match(new RegExp(`(?:^|;)\\s*${property}:[^;]*var\\(--quoin-([\\w-]+)\\)`));
  if (!value) throw new Error(`no ${property} token in the rule ${selector}`);
  return value[1];
}

const WORDS = ['.quoin-diff ins', '.quoin-diff del'].map((selector) => ({
  selector,
  text: paintedWith(selector, 'color'),
  wash: paintedWith(selector, 'background-color'),
}));

const RULES = ['added', 'removed', 'moved', 'changed'].map((status) =>
  paintedWith(`.quoin-diff [data-diff="${status}"]${status === 'moved' ? ',\n.quoin-diff [data-diff="moved-away"]' : ''}`, 'border-inline-start-color'),
);

describe.each<Theme>(['light', 'dark'])('the diff in the %s theme', (theme) => {
  it.each(WORDS)('writes the words of $selector at 4.5:1 or more on their wash and on the page', ({ text, wash }) => {
    expect(contrast(theme, text, wash)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme, text, 'background')).toBeGreaterThanOrEqual(4.5);
  });

  it('draws the rule of each kind of change at 3:1 or more against the page', () => {
    expect(RULES.map((rule) => contrast(theme, rule, 'background') >= 3)).toEqual(RULES.map(() => true));
  });

  it('writes the labels at 4.5:1 or more on the page', () => {
    expect(contrast(theme, paintedWith('.quoin-diff [data-diff-label]', 'color'), 'background')).toBeGreaterThanOrEqual(4.5);
  });
});

it('ships with the stylesheet, among the components', () => {
  expect(stylesCss).toContain('@import "./diff/diff.css" layer(quoin.components);');
});
