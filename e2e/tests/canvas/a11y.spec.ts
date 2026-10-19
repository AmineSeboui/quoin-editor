import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { openEditor } from '../../support/editor';
import { phoneTest } from '../../support/phone';

const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const serious = (page: Page) => axeViolations(page, 'serious', '.quoin');

async function selectFirstWord(page: Page) {
  await host(page, 'p').click({ position: { x: 1, y: 12 } });
  for (let i = 0; i < 'Keeps'.length; i++) await page.keyboard.press('Shift+ArrowRight');
}

const STATES: Record<string, (page: Page) => Promise<void>> = {
  'at rest': async () => {},
  'with the slash menu open': async (page) => {
    await host(page, 'tc').click();
    await page.keyboard.press('End');
    await page.keyboard.type(' /');
    await expect(page.getByRole('listbox', { name: 'Commands' })).toBeVisible();
  },
  'with the block menu open': async (page) => {
    await host(page, 'p').hover();
    await page.getByRole('button', { name: 'Drag to move, click for options' }).click();
    await expect(page.getByRole('menu', { name: 'Text block menu' })).toBeVisible();
  },
  'with the context menu open': async (page) => {
    await page.getByText('https://quoin.dev', { exact: true }).click({ button: 'right' });
    await expect(page.getByRole('menu', { name: 'Bookmark block menu' })).toBeVisible();
  },
  'with the bubble toolbar visible': async (page) => {
    await selectFirstWord(page);
    await expect(page.getByRole('toolbar', { name: 'Text formatting' })).toBeVisible();
  },
  'with the link popover open': async (page) => {
    await selectFirstWord(page);
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByRole('textbox', { name: 'Link address' })).toBeFocused();
  },
  'with the shortcuts dialog open': async (page) => {
    await host(page, 'p').click();
    await page.keyboard.press('ControlOrMeta+Shift+Slash');
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  },
};

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`in ${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    for (const [state, reach] of Object.entries(STATES)) {
      test(`axe finds no serious violation ${state}`, async ({ page }) => {
        await openEditor(page, 'rich');
        await expect(page.locator('html')).toHaveClass(scheme === 'dark' ? 'dark' : '');
        await reach(page);
        expect(await serious(page)).toEqual([]);
      });
    }
  });
}

phoneTest.describe('on a phone', () => {
  phoneTest.skip(({ browserName }) => browserName === 'firefox', 'Firefox cannot emulate a mobile device');

  phoneTest('axe finds no serious violation with the editing tools and the handle shown', async ({ page }) => {
    await openEditor(page, 'rich');
    await host(page, 'p').tap({ position: { x: 1, y: 12 } });
    await expect(page.getByRole('toolbar', { name: 'Editing tools' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Drag to move, click for options' })).toBeVisible();
    expect(await serious(page)).toEqual([]);
  });
});
