import { PALETTE, type PaletteName } from '../engine';
import { englishLabels } from './english-labels';
import type { QuoinLabels } from './labels';

describe('the QuoinLabels type', () => {
  it('still takes a complete translation written before the optional labels were added', () => {
    const { blockError, decorativeImage, noAltBadge, addAltText, textColorSample, ...translation } = englishLabels;
    const labels: QuoinLabels = translation;
    expect([blockError, decorativeImage, noAltBadge]).toEqual(['Block could not be drawn', 'Decorative image', 'No alt text']);
    expect(addAltText).toBe('No alt text, add alt text');
    expect(textColorSample).toBe('A');
    expect(labels).not.toHaveProperty('noAltBadge');
  });

  it('keys the colour names by PaletteName, which a translation imports from the engine entry', () => {
    expectTypeOf<keyof QuoinLabels['colors']>().toEqualTypeOf<PaletteName>();
    expect(Object.keys(englishLabels.colors)).toEqual([...PALETTE]);
  });
});
