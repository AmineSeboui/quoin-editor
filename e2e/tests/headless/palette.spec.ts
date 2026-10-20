import { expect, test, type Page } from '@playwright/test';
import { PALETTE } from '../../../src/engine/markdown/palette';
import { openHeadless } from '../../support/headless';

// Each attribute the view and the HTML export write, on a probe inside a .quoin root, with every colour read back as the
// red, green and blue a canvas paints, so an oklch() token and the rgb() the browser computes compare.
function paintedPalette(page: Page) {
  return page.evaluate((names) => {
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const paint = (value: string) => {
      context.fillStyle = '#000';
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
    };
    const probe = document.createElement('div');
    probe.className = 'quoin';
    document.body.append(probe);
    const tokens = getComputedStyle(document.documentElement);
    const painted = names.map((name) => {
      probe.innerHTML = `<span data-color="${name}">a</span><span data-bg="${name}">b</span><mark data-color="${name}">c</mark><div data-quoin-block="" data-color="${name}" data-bg="${name}">d</div>`;
      const [text, wash, mark, block] = Array.from(probe.children, (element) => getComputedStyle(element));
      return {
        name,
        tokens: [paint(tokens.getPropertyValue(`--quoin-color-${name}`)), paint(tokens.getPropertyValue(`--quoin-bg-${name}`))],
        inline: [paint(text.color), paint(wash.backgroundColor)],
        highlight: [paint(mark.color), paint(mark.backgroundColor)],
        block: [paint(block.color), paint(block.backgroundColor)],
      };
    });
    probe.innerHTML = '<mark>plain</mark>';
    const plain = getComputedStyle(probe.firstElementChild!);
    const around = paint(getComputedStyle(probe).color);
    const result = { painted, around, plain: [paint(plain.color), paint(plain.backgroundColor)], yellow: paint(tokens.getPropertyValue('--quoin-bg-yellow')) };
    probe.remove();
    return result;
  }, [...PALETTE]);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`the ${scheme} palette`, () => {
    test.use({ colorScheme: scheme });

    test('paints inline colours, highlights and block colours from the --quoin-color and --quoin-bg tokens', async ({ page }) => {
      await openHeadless(page);
      const { painted, around, plain, yellow } = await paintedPalette(page);
      for (const { name, tokens: [color, background], inline, highlight, block } of painted) {
        expect(inline, `data-color and data-bg ${name}`).toEqual([color, background]);
        expect(highlight, `mark[data-color=${name}] keeps the text colour around it`).toEqual([around, background]);
        expect(block, `a block coloured ${name}`).toEqual([color, background]);
      }
      expect(plain, 'a highlight with no colour is yellow').toEqual([around, yellow]);
      expect(new Set(painted.map(({ tokens }) => tokens.join())).size, 'ten distinct colours').toBe(PALETTE.length);
    });
  });
}
