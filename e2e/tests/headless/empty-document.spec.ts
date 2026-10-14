import { expect, test, type Page } from '@playwright/test';
import { host, markdown, openHeadless } from '../../support/headless';

const THREE = ['Alpha beta gamma', 'Delta epsilon', 'Zeta eta theta'];

const emptyHost = (page: Page) => page.locator('[data-quoin-empty]');
const changes = (page: Page) => page.evaluate(() => window.__quoin.changes);

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function selectEveryBlock(page: Page) {
  await host(page, 1).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+a');
  await expect(page.locator('[data-quoin-block][data-selected="true"]')).toHaveCount(3);
}

async function expectFocusInEmptyHost(page: Page) {
  await expect(emptyHost(page)).toBeFocused();
  const tabStops = page.locator('.quoin-editor [tabindex="0"]');
  await expect(tabStops).toHaveCount(1);
  await expect(tabStops).toHaveAttribute('data-quoin-empty', '');
}

test.describe('the empty document', () => {
  test('deleting every block leaves focus in the empty host, where undo and redo still work', async ({ page }) => {
    const errors = collectErrors(page);
    await openHeadless(page, 'three');
    await selectEveryBlock(page);
    await page.keyboard.press('Backspace');
    await expect.poll(() => markdown(page)).toEqual([]);
    await expectFocusInEmptyHost(page);
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => markdown(page)).toEqual(THREE);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect.poll(() => markdown(page)).toEqual([]);
    await expectFocusInEmptyHost(page);
    await page.keyboard.type('q');
    await expect.poll(() => markdown(page)).toEqual(['q']);
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => markdown(page)).toEqual([]);
    await expectFocusInEmptyHost(page);
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => markdown(page)).toEqual(THREE);
    expect(errors).toEqual([]);
  });

  test('cutting every block leaves focus in the empty host and undo brings them back', async ({ page }) => {
    await openHeadless(page, 'three');
    await selectEveryBlock(page);
    await page.evaluate(() => {
      const cut = new ClipboardEvent('cut', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true });
      document.activeElement!.dispatchEvent(cut);
    });
    await expect.poll(() => markdown(page)).toEqual([]);
    await expectFocusInEmptyHost(page);
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => markdown(page)).toEqual(THREE);
  });

  test('undo with nothing left to undo keeps the document empty and throws nothing', async ({ page }) => {
    const errors = collectErrors(page);
    await openHeadless(page, 'empty');
    await emptyHost(page).click();
    await page.keyboard.type('q');
    await expect.poll(() => markdown(page)).toEqual(['q']);
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => markdown(page)).toEqual([]);
    await page.keyboard.press('ControlOrMeta+z');
    expect(await markdown(page)).toEqual([]);
    await expectFocusInEmptyHost(page);
    expect(errors).toEqual([]);
  });

  test('Enter, Backspace and Delete in the empty host change nothing, then typing starts the document', async ({ page }) => {
    await openHeadless(page, 'empty');
    await emptyHost(page).click();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Delete');
    expect(await markdown(page)).toEqual([]);
    expect(await changes(page)).toBe(0);
    await expect(emptyHost(page)).toHaveJSProperty('innerHTML', '<br data-quoin-filler="">');
    await expectFocusInEmptyHost(page);
    await page.keyboard.type('a');
    await expect.poll(() => markdown(page)).toEqual(['a']);
  });
});
