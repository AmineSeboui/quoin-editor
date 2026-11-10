import { expect, test } from '@playwright/test';
import { axeViolations, stayLocal } from './support';

test.beforeEach(({ page }) => stayLocal(page));

for (const theme of ['light', 'dark'] as const) {
  test(`the open search panel breaks no axe rule in the ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('comparison/');
    await page.getByRole('button', { name: 'Search this site' }).click();
    await page.getByRole('combobox', { name: 'Search this site' }).fill('tiptap');
    await expect(page.getByRole('option').first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
}

test('a code block copies itself', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Only Chromium gives a headless page both clipboard permissions.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('');
  await page.getByRole('button', { name: 'Copy install command' }).first().click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm install quoin-editor');
});

test('a copy says so, for a reader who cannot see the check', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } });
  });
  await page.goto('');
  await page.getByRole('button', { name: 'Copy install command' }).first().click();
  await expect(page.locator('[data-announce]')).toHaveText('Copied');
});

test('search finds a section and opens it', async ({ page }) => {
  await page.goto('comparison/');
  await page.getByRole('button', { name: 'Search this site' }).click();
  const field = page.getByRole('combobox', { name: 'Search this site' });
  await field.fill('1.x to 2.0');
  const hit = page.getByRole('option').first();
  await expect(hit).toContainText('Migrating Quoin');
  await hit.click();
  await expect(page).toHaveURL(/migration\/#migrating-from-1x-to-20$/);
});

test('search says so when nothing matches', async ({ page }) => {
  await page.goto('comparison/');
  await page.keyboard.press('/');
  await page.getByRole('combobox', { name: 'Search this site' }).fill('zzzzqqq');
  await expect(page.getByText(/Nothing on this site matches/)).toBeVisible();
});

test('a recording can be stopped, and stays stopped', async ({ page }) => {
  await page.goto('');
  const clip = page.locator('[data-clip-figure]').first();
  await clip.scrollIntoViewIfNeeded();
  await clip.getByRole('button', { name: 'Pause the recording' }).click();
  await expect(clip).toHaveAttribute('data-state', 'paused');
  await expect(clip.locator('canvas')).toBeVisible();
  await expect(clip.locator('img')).toHaveCount(0);
});

test('a reader who asks for reduced motion is sent no recording at all', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  const clip = page.locator('[data-clip-figure]').first();
  await expect(clip).toHaveAttribute('data-state', 'paused');
  await expect(clip.locator('img')).toHaveJSProperty('currentSrc', '');
  await expect(clip.getByRole('button', { name: 'Play the recording' })).toBeVisible();
});

test('an address with no page lands on the 404 page, which sends the reader on', async ({ page }) => {
  await page.goto('404.html');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('That page is not here');
  await expect(page.getByRole('link', { name: 'Getting started' })).toHaveAttribute(
    'href',
    'https://quoincloud.com/docs/editor/getting-started',
  );
  await page.getByRole('link', { name: 'Playground' }).first().click();
  await expect(page).toHaveURL(/playground\/$/);
});
