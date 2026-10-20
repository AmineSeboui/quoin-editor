import { expect, test, type Page } from '@playwright/test';
import { openEditor } from '../../support/editor';

const area = (page: Page) => page.getByRole('textbox', { name: 'Code' });

async function caretAtEnd(page: Page) {
  await area(page).click();
  await area(page).evaluate((field: HTMLTextAreaElement) => field.setSelectionRange(field.value.length, field.value.length));
}

test('Enter keeps the caret in view as the code grows past the bottom of the window', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 400 });
  await openEditor(page, 'code');
  await caretAtEnd(page);
  for (let line = 0; line < 25; line += 1) await page.keyboard.press('Enter');
  const box = (await area(page).boundingBox())!;
  const lastLineBottom = box.y + box.height - 12;
  expect(lastLineBottom).toBeLessThanOrEqual(400);
  expect(lastLineBottom).toBeGreaterThan(0);
});

test('Tab keeps the caret in view at the end of a line wider than the block', async ({ page }) => {
  await openEditor(page, 'long-code');
  await caretAtEnd(page);
  await page.keyboard.press('Tab');
  const scroller = page.locator('[data-block-id="k"] .quoin-code-scroll');
  await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});
