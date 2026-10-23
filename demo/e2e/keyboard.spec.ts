import { expect, test } from '@playwright/test';
import { stayLocal } from './support';

test.beforeEach(({ page }) => stayLocal(page));

test('the skip link is the first stop and takes focus to the main content', async ({ page, browserName }) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.goto('docs/getting-started/');
  await page.keyboard.press(tab);
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('the site navigation and the guide are reached with Tab', async ({ page, browserName }) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.goto('docs/theming/');
  const guide = page.getByRole('navigation', { name: 'Guide' }).getByRole('link', { name: 'Theming' });
  for (let presses = 0; presses < 40; presses++) {
    await page.keyboard.press(tab);
    if (await guide.evaluate((link) => link === document.activeElement)) break;
  }
  await expect(guide).toBeFocused();
  await expect(guide).toHaveAttribute('aria-current', 'page');
});

test('the theme button switches the page to dark and remembers it', async ({ page }) => {
  await page.goto('');
  const button = page.getByRole('button', { name: 'Dark mode' });
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await button.click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.goto('docs/faq/');
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true');
});
