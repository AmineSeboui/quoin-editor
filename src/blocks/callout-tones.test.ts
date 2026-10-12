import { TONE } from './previews';

/** The distinctness of the five colours is checked against the built stylesheet by
 *  `scripts/check-css-scope.mjs`, because that is where the values live. This holds
 *  the shape: every tone the editor offers is painted, from one colour each. */
describe('callout tones', () => {
  it('paints every tone the editor offers', () => {
    expect(Object.keys(TONE).sort()).toEqual(['danger', 'info', 'success', 'tip', 'warning']);
  });

  it.each(Object.entries(TONE))('%s takes its rule and its wash from one colour', (_tone, paint) => {
    const [border, bg] = paint.split(' ');
    expect(border).toMatch(/^border-[a-z]+$/);
    expect(bg).toBe(`bg-${border.slice('border-'.length)}/15`);
  });
});
