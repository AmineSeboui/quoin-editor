import { expect, test, type Page } from '@playwright/test';
import { openEditor } from '../../support/editor';

test.use({ viewport: { width: 700, height: 500 } });

// Scroll anchoring would move a scroller by the height of the removed block, which is not a reveal.
const layouts = [
  { name: 'a page', css: 'html, body { overflow-anchor: none } body { padding-bottom: 3000px }', canvas: false },
  {
    name: 'a page that scrolls smoothly',
    css: 'html { scroll-behavior: smooth } html, body { overflow-anchor: none } body { padding-bottom: 3000px }',
    canvas: false,
  },
  {
    name: 'a canvas that scrolls itself',
    css:
      '.quoin-editor { height: 300px; overflow: auto; overflow-anchor: none } ' +
      '.quoin-editor::after { content: ""; display: block; height: 3000px }',
    canvas: true,
  },
];

const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);

for (const { name, css, canvas } of layouts) {
  test.describe(`a collaborator removing the block the writer has selected, out of view on ${name}`, () => {
    const scrolled = (page: Page) =>
      page.evaluate((inside) => (inside ? document.querySelector('.quoin-editor')!.scrollTop : window.scrollY), canvas);

    async function scrollAway(page: Page) {
      await page.addStyleTag({ content: css });
      await page.evaluate((inside) => {
        const scroller = inside ? document.querySelector('.quoin-editor')! : document.scrollingElement!;
        scroller.scrollTo({ top: 2000, behavior: 'instant' });
      }, canvas);
      await expect.poll(() => scrolled(page)).toBeGreaterThan(1000);
      return scrolled(page);
    }

    async function removeRemotely(page: Page, id: string) {
      await page.evaluate((block) => window.__quoin.removeRemotely!(block), id);
      await expect(page.locator(`[data-block-id="${id}"]`)).toHaveCount(0);
      await page.waitForTimeout(1000);
    }

    test('leaves it where it is while the block is selected whole', async ({ page }) => {
      await openEditor(page, 'forty');
      await host(page, 'p2').click();
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-block-id="p2"]')).toHaveAttribute('data-selected', 'true');
      const at = await scrollAway(page);
      await removeRemotely(page, 'p2');
      await expect(page.locator('[data-block-id="p3"]')).toHaveAttribute('data-selected', 'true');
      expect(await scrolled(page)).toBe(at);
    });

    test('leaves it where it is while the caret is in it, and keeps focus in the editor', async ({ page }) => {
      await openEditor(page, 'forty');
      await host(page, 'p2').click();
      await expect(host(page, 'p2')).toBeFocused();
      const at = await scrollAway(page);
      await removeRemotely(page, 'p2');
      expect(await scrolled(page)).toBe(at);
      expect(await page.evaluate(() => document.activeElement?.closest('[data-quoin-host]') !== null)).toBe(true);
    });
  });
}
