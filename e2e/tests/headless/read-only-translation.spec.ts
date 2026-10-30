import { expect, test, type Page } from '@playwright/test';
import { host, openHeadless } from '../../support/headless';

async function dragAcross(page: Page, from: number, to: number) {
  const a = (await host(page, from).boundingBox())!;
  const b = (await host(page, to).boundingBox())!;
  await page.mouse.move(a.x + 4, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width - 4, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

const shortenText = (page: Page) =>
  page.evaluate(() => {
    const walker = document.createTreeWalker(document.querySelector('.quoin-editor')!, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest('[data-quoin-host]')) (node as Text).data = 'Ab';
    }
  });

const wrapText = (page: Page) =>
  page.evaluate(() => {
    for (const element of document.querySelectorAll('[data-quoin-host]')) {
      for (const node of [...element.childNodes]) {
        if (node.nodeType !== Node.TEXT_NODE) continue;
        const font = document.createElement('font');
        font.textContent = 'Translated';
        node.replaceWith(font);
      }
    }
  });

test.describe('a read-only document a page translator rewrote', () => {
  for (const [name, translate] of [
    ['shortened in place', shortenText],
    ['wrapped in new elements', wrapText],
  ] as const) {
    test(`dragging across blocks never throws when its text was ${name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await openHeadless(page, 'three', 'readonly=1');
      await translate(page);
      await dragAcross(page, 0, 2);
      await dragAcross(page, 2, 0);
      await expect(page.locator('.quoin-editor')).toHaveAttribute('data-quoin-cross', '');
      expect(errors).toEqual([]);
    });
  }
});
