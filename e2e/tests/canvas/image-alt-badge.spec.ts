import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const alt = async (page: Page) => (await blocks(page)).find((block) => block.id === 'img')?.data.alt;
const badge = (page: Page) => page.getByRole('button', { name: 'No alt text, add alt text' });
const field = (page: Page) => page.getByRole('textbox', { name: 'Alt text' });
const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

async function openFromBadge(page: Page) {
  await page.setViewportSize({ width: 700, height: 600 });
  await openEditor(page, 'no-alt');
  await page.getByText('Above the image', { exact: true }).click();
  await badge(page).scrollIntoViewIfNeeded();
  await badge(page).click();
  await expect(field(page)).toBeFocused();
  return scrollY(page);
}

async function backOnTheImage(page: Page, scrolled: number) {
  await expect(field(page)).toHaveCount(0);
  await expect(page.locator('[data-quoin-sink]')).toBeFocused();
  await expect(page.locator('[data-block-id="img"]')).toHaveAttribute('data-selected', 'true');
  expect(scrolled).toBeGreaterThan(0);
  expect(await scrollY(page)).toBe(scrolled);
}

test('saving the popover the No alt text badge opened stores the text and hands focus back to the image, in place', async ({ page }) => {
  const scrolled = await openFromBadge(page);
  await field(page).fill('A red square');
  await page.keyboard.press('Enter');
  await expect.poll(() => alt(page)).toBe('A red square');
  await expect(badge(page)).toHaveCount(0);
  await backOnTheImage(page, scrolled);
});

test('escaping the popover the No alt text badge opened hands focus back to the image, in place', async ({ page }) => {
  const scrolled = await openFromBadge(page);
  await field(page).fill('Dropped');
  await page.keyboard.press('Escape');
  expect(await alt(page)).toBe('');
  await expect(badge(page)).toBeVisible();
  await backOnTheImage(page, scrolled);
});
