import { expect, test } from '@playwright/test';
import { axeViolations, stayLocal } from './support';

test.beforeEach(({ page }) => stayLocal(page));

for (const theme of ['light', 'dark'] as const) {
  test(`the open search panel breaks no axe rule in the ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('docs/faq/');
    await page.getByRole('button', { name: 'Search the guide' }).click();
    await page.getByRole('combobox', { name: 'Search the guide' }).fill('markdown');
    await expect(page.getByRole('option').first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
}

test('a code block copies itself', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Only Chromium gives a headless page both clipboard permissions.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('docs/getting-started/');
  await page.getByRole('button', { name: 'Copy the command' }).first().click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm install quoin-editor');
});

test('a copy says so, for a reader who cannot see the check', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } });
  });
  await page.goto('docs/getting-started/');
  await page.getByRole('button', { name: 'Copy the command' }).first().click();
  await expect(page.getByRole('status')).toHaveText('Copied');
});

test('the table of contents marks the section the reader has reached', async ({ page }) => {
  await page.goto('docs/theming/');
  const toc = page.getByRole('navigation', { name: 'On this page' });
  await expect(toc.getByRole('link')).not.toHaveCount(0);
  const dark = toc.getByRole('link', { name: 'Dark mode' });
  await dark.click();
  await expect(dark).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#dark-mode')).toBeInViewport();
});

test('a guide page links to the one before it and the one after', async ({ page }) => {
  await page.goto('docs/theming/');
  const steps = page.getByRole('navigation', { name: 'Previous and next page' });
  await steps.getByRole('link', { name: /Custom blocks/ }).click();
  await expect(page).toHaveURL(/docs\/custom-blocks\/$/);
});

test('search finds a section and opens it', async ({ page }) => {
  await page.goto('docs/faq/');
  await page.getByRole('button', { name: 'Search the guide' }).click();
  const field = page.getByRole('combobox', { name: 'Search the guide' });
  await field.fill('cascade layers');
  const hit = page.getByRole('option').first();
  await expect(hit).toContainText('Theming');
  await hit.click();
  await expect(page).toHaveURL(/docs\/theming\/#cascade-layers-and-import-order$/);
});

test('search says so when nothing matches', async ({ page }) => {
  await page.goto('docs/faq/');
  await page.keyboard.press('/');
  await page.getByRole('combobox', { name: 'Search the guide' }).fill('zzzzqqq');
  await expect(page.getByText(/Nothing in the guide matches/)).toBeVisible();
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

test('an address with no page lands on the 404 page, which offers the guide', async ({ page }) => {
  await page.goto('404.html');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('That page is not here');
  await page.getByRole('link', { name: 'Getting started' }).first().click();
  await expect(page).toHaveURL(/docs\/getting-started\/$/);
});
