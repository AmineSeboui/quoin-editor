import { expect, test } from '@playwright/test';
import { sitePages } from './site-pages';
import { axeViolations, stayLocal, waitForIslands } from './support';

test.beforeEach(({ page }) => stayLocal(page));

for (const theme of ['light', 'dark'] as const) {
  test.describe(`in the ${theme} theme`, () => {
    test.use({ colorScheme: theme });

    for (const { path, live } of sitePages) {
      test(`/${path} has one h1, its title and no axe violation`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(path);
        await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /\bdark\b/ : /^(?!.*\bdark\b)/);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page).toHaveTitle(/\S/);
        if (live) await waitForIslands(page);
        expect(await axeViolations(page)).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  });
}
