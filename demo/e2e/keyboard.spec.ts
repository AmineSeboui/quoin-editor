import { expect, test } from '@playwright/test';
import { stayLocal } from './support';

test.beforeEach(({ page }) => stayLocal(page));

test('the skip link is the first stop and takes focus to the main content', async ({ page, browserName }) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.goto('comparison/');
  await page.keyboard.press(tab);
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('the site navigation is reached with Tab and marks the page the reader is on', async ({ page, browserName }) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.goto('comparison/');
  const here = page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Comparison' });
  for (let presses = 0; presses < 40; presses++) {
    await page.keyboard.press(tab);
    if (await here.evaluate((link) => link === document.activeElement)) break;
  }
  await expect(here).toBeFocused();
  await expect(here).toHaveAttribute('aria-current', 'page');
});

test('the theme button switches the page to dark and remembers it', async ({ page }) => {
  await page.goto('');
  const button = page.getByRole('button', { name: 'Dark mode' });
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await button.click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.goto('comparison/');
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true');
});
