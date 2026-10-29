import { englishLabels } from './english-labels';
import type { QuoinLabels } from './labels';

describe('the QuoinLabels type', () => {
  it('still takes a complete translation written before the optional labels were added', () => {
    const { blockError, decorativeImage, noAltBadge, addAltText, ...translation } = englishLabels;
    const labels: QuoinLabels = translation;
    expect([blockError, decorativeImage, noAltBadge]).toEqual(['Block could not be drawn', 'Decorative image', 'No alt text']);
    expect(addAltText).toBe('Add alt text');
    expect(labels).not.toHaveProperty('noAltBadge');
  });
});
