import { expect, test } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { openEditor } from '../../support/editor';

test('axe finds no violation on a code line wider than its block, on an editable canvas', async ({ page }) => {
  await openEditor(page, 'long-code');
  await page.getByRole('textbox', { name: 'Paragraph' }).click();
  expect(await axeViolations(page)).toEqual([]);
});

test('axe finds no violation on a code line wider than its block, on a read-only canvas', async ({ page }) => {
  await openEditor(page, 'long-code', 'readonly=1');
  expect(await axeViolations(page)).toEqual([]);
});

test('on a read-only canvas the keyboard reaches a long line of code and its copy button', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit, as Safari does by default, leaves buttons out of the Tab order');
  await openEditor(page, 'long-code', 'readonly=1');
  const code = page.getByRole('region', { name: 'TypeScript' });
  await code.focus();
  await expect(code).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  const copy = page.getByRole('button', { name: 'Copy code' });
  await expect(copy).toBeFocused();
  await expect(copy).toHaveCSS('opacity', '1');
});

test('on a read-only canvas the arrows scroll the focused code', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', "Playwright's WebKit does not scroll a focused element with the arrow keys");
  await openEditor(page, 'long-code', 'readonly=1');
  const code = page.getByRole('region', { name: 'TypeScript' });
  await code.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => code.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});
