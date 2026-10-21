import { expect, test, type Page } from '@playwright/test';
import { openEditor } from '../../support/editor';

const PAGE = 'body { padding-top: 600px; padding-bottom: 1500px }';
const CONTAINER =
  'html, body { height: 100%; margin: 0; overflow: hidden } #root { height: 500px; overflow: auto } ' +
  '#root::before { content: ""; display: block; height: 600px } #root::after { content: ""; display: block; height: 1200px }';
const TRANSFORMED = ' .quoin { transform: translateZ(0) }';
const FAR_FROM_THE_TOP = ' [data-block-id="img"] { margin-top: 900px }';

const layouts = [
  { name: 'a page', css: PAGE, container: false },
  { name: 'a scroll container', css: CONTAINER, container: true },
  { name: 'a page, under a transform', css: PAGE + TRANSFORMED, container: false },
  { name: 'a scroll container, under a transform', css: CONTAINER + TRANSFORMED, container: true },
];

const sink = (page: Page) => page.locator('[data-quoin-sink]');
const shell = (page: Page, id: string) => page.locator(`[data-block-id="${id}"]`);
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Image tools' });

test.use({ viewport: { width: 700, height: 600 } });

for (const { name, css, container } of layouts) {
  test.describe(`on ${name}, scrolled`, () => {
    const scrolled = (page: Page) =>
      page.evaluate((inside) => (inside ? document.querySelector('#root')!.scrollTop : window.scrollY), container);

    async function openScrolledTo(page: Page, id: string, below: number) {
      await openEditor(page, 'image');
      await page.addStyleTag({ content: css + FAR_FROM_THE_TOP });
      await page.evaluate(
        ({ inside, id, below }) => {
          const top = document.querySelector(`[data-block-id="${id}"]`)!.getBoundingClientRect().top;
          const scroller = inside ? document.querySelector('#root')! : document.scrollingElement!;
          const offset = inside ? scroller.getBoundingClientRect().top : 0;
          scroller.scrollTo({ top: scroller.scrollTop + top - offset - below, behavior: 'instant' });
        },
        { inside: container, id, below },
      );
      return scrolled(page);
    }

    async function staysAt(page: Page, at: number, id: string) {
      await expect(shell(page, id)).toHaveAttribute('data-selected', 'true');
      await expect(sink(page)).toBeFocused();
      await page.waitForTimeout(300);
      expect(await scrolled(page)).toBe(at);
    }

    test('Enter in the alt text of an image leaves it where it is', async ({ page }) => {
      const at = await openScrolledTo(page, 'img', 100);
      await page.getByRole('img', { name: 'A red square' }).click();
      await toolbar(page).getByRole('button', { name: 'Alt text' }).click();
      await page.getByRole('textbox', { name: 'Alt text' }).fill('A red square, small');
      await page.keyboard.press('Enter');
      await expect(page.getByRole('img', { name: 'A red square, small' })).toBeVisible();
      await staysAt(page, at, 'img');
    });

    test('Escape from the toolbar of an image leaves it where it is', async ({ page }) => {
      const at = await openScrolledTo(page, 'img', 100);
      await page.getByRole('img', { name: 'A red square' }).click();
      await page.keyboard.press('Alt+F10');
      await expect(toolbar(page).getByRole('button', { name: 'Align left' })).toBeFocused();
      await page.keyboard.press('Escape');
      await staysAt(page, at, 'img');
    });

    test('ArrowUp onto a divider in view leaves it where it is', async ({ page }) => {
      const at = await openScrolledTo(page, 'd', 150);
      const below = (await shell(page, 'q').boundingBox())!;
      await page.mouse.click(below.x + 1, below.y + below.height / 2);
      await page.keyboard.press('ArrowUp');
      await staysAt(page, at, 'd');
    });

    test('ArrowUp onto a divider out of view scrolls only as far as brings it into view', async ({ page }) => {
      const at = await openScrolledTo(page, 'q', 2);
      const above = await page.evaluate((inside) => {
        const top = document.querySelector('[data-block-id="d"]')!.getBoundingClientRect().top;
        return top - (inside ? document.querySelector('#root')!.getBoundingClientRect().top : 0);
      }, container);
      expect(above).toBeLessThan(0);
      const below = (await shell(page, 'q').boundingBox())!;
      await page.mouse.click(below.x + 1, below.y + below.height / 2);
      await page.keyboard.press('ArrowUp');
      await expect(shell(page, 'd')).toHaveAttribute('data-selected', 'true');
      await expect(sink(page)).toBeFocused();
      await page.waitForTimeout(300);
      expect(Math.abs((await scrolled(page)) - (at + above))).toBeLessThanOrEqual(1);
    });
  });
}
