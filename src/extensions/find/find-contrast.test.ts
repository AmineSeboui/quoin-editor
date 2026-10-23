import tokensCss from '../../ui/tokens.css?raw';
import findCss from './find.css?raw';
import { contrastRatio, tokenReader, type Theme } from '../../ui/oklch-contrast';

const token = tokenReader(tokensCss);

/** The token the find stylesheet paints a property of the current match with. */
function currentMatch(property: string): string {
  const rule = findCss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('}').find((chunk) => chunk.split('{')[0].trim() === '.quoin .quoin-find-current');
  const value = rule?.match(new RegExp(`${property}:[^;]*var\\(--quoin-([\\w-]+)\\)`));
  if (!value) throw new Error(`no ${property} token on the current match`);
  return value[1];
}

const OUTLINE = currentMatch('outline');
const WASH = currentMatch('background');

// WCAG 1.4.11: the outline that marks the current match apart from the others is a graphical object, held to 3:1
// against the wash it surrounds and the page the outline offset shows beside it.
describe.each<Theme>(['light', 'dark'])('the current find match in the %s theme', (theme) => {
  it.each([WASH, 'background'])('has an outline with 3:1 contrast against --quoin-%s', (surface) => {
    expect(contrastRatio(token(theme, OUTLINE), token(theme, surface))).toBeGreaterThanOrEqual(3);
  });
});
