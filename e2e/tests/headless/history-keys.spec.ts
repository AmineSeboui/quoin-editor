import { expect, test, type Page } from '@playwright/test';
import { host, modelSelection, openHeadless } from '../../support/headless';

const START = 'about:blank#start';
const MAC = process.platform === 'darwin';

async function openAfterAnotherPage(page: Page) {
  await page.goto(START);
  await openHeadless(page, 'divider');
  await page.evaluate(() => {
    window.addEventListener('keydown', (event) => {
      document.documentElement.dataset.defaultPrevented = String(event.defaultPrevented);
    });
  });
}

async function press(page: Page, key: string) {
  await page.keyboard.press(key);
  await expect(page.locator('html')).toHaveAttribute('data-default-prevented', 'true');
  await page.waitForTimeout(250);
  expect(page.url()).toContain('doc=divider');
}

test.describe('keys the browser takes for history navigation', () => {
  test('Cmd arrows over a node-selected divider stay in the page and leave the selection', async ({ page }) => {
    await openAfterAnotherPage(page);
    await page.locator('[data-type="DIVIDER"]').click();
    const selected = { kind: 'node', block: 'd' };
    await expect.poll(() => modelSelection(page)).toEqual(selected);
    const vertical = MAC ? [] : ['Meta+ArrowUp', 'Meta+ArrowDown'];
    for (const key of ['Meta+ArrowLeft', 'Meta+ArrowRight', ...vertical]) {
      await press(page, key);
      expect(await modelSelection(page)).toEqual(selected);
    }
  });

  test('Cmd+ArrowUp and Cmd+ArrowDown over a node-selected divider go to the document edges', async ({ page }) => {
    test.skip(!MAC, 'Command with a vertical arrow goes to an edge of the document on macOS only');
    await openAfterAnotherPage(page);
    const divider = page.locator('[data-type="DIVIDER"]');
    await divider.click();
    await expect.poll(() => modelSelection(page)).toEqual({ kind: 'node', block: 'd' });
    await press(page, 'Meta+ArrowUp');
    expect(await modelSelection(page)).toMatchObject({ kind: 'text', head: { block: 'a', offset: 0 } });
    await divider.click();
    await expect.poll(() => modelSelection(page)).toEqual({ kind: 'node', block: 'd' });
    await press(page, 'Meta+ArrowDown');
    expect(await modelSelection(page)).toMatchObject({ kind: 'text', head: { block: 'b', offset: 1 } });
  });

  test('Cmd and Alt arrows over a block selection stay in the page and leave the selection', async ({ page }) => {
    await openAfterAnotherPage(page);
    await host(page, 0).click();
    await page.keyboard.press('Escape');
    const selected = { kind: 'blocks', anchor: 'a', head: 'a' };
    expect(await modelSelection(page)).toEqual(selected);
    for (const key of ['Meta+ArrowLeft', 'Meta+ArrowRight', 'Alt+ArrowLeft', 'Alt+ArrowRight']) {
      await press(page, key);
      expect(await modelSelection(page)).toEqual(selected);
    }
  });

  test('Alt arrows over a node-selected divider move to the neighbouring block and stay in the page', async ({ page }) => {
    await openAfterAnotherPage(page);
    await page.locator('[data-type="DIVIDER"]').click();
    await expect.poll(() => modelSelection(page)).toEqual({ kind: 'node', block: 'd' });
    await press(page, 'Alt+ArrowRight');
    expect(await modelSelection(page)).toMatchObject({ kind: 'text', head: { block: 'b', offset: 0 } });
  });
});
