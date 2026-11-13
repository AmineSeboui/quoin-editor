import viewCss from '../view/view.css?raw';
import { CALLOUT_TONES } from '../engine/blocks/callout-tones';
import { TONE } from './previews';

const DEFAULT_TONE = 'info';

/** The tones the view's stylesheet gives a rule colour of their own, past the default one. */
const STYLED = [...viewCss.matchAll(/\.quoin-callout\[data-tone="([\w-]+)"\]/g)].map(([, tone]) => tone);

/** The distinctness of the five colours is checked against the built stylesheet by
 *  `scripts/check-css-scope.mjs`, because that is where the values live. This holds
 *  the shape: every tone the editor offers is painted, from one colour each. */
describe('callout tones', () => {
  it('paints every tone the editor offers', () => {
    expect(Object.keys(TONE).sort()).toEqual([...CALLOUT_TONES].sort());
  });

  it.each(Object.entries(TONE))('%s takes its rule and its wash from one colour', (_tone, paint) => {
    const [border, bg] = paint.split(' ');
    expect(border).toMatch(/^border-[a-z]+$/);
    expect(bg).toBe(`bg-${border.slice('border-'.length)}/15`);
  });

  it('gives the view a rule colour for every tone past the default, and for no tone outside the list', () => {
    expect(CALLOUT_TONES).toContain(DEFAULT_TONE);
    expect(STYLED.sort()).toEqual(CALLOUT_TONES.filter((tone) => tone !== DEFAULT_TONE).sort());
  });
});
