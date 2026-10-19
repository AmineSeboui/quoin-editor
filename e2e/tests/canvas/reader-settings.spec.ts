import { expect, test, type Locator, type Page } from '@playwright/test';
import { openEditor } from '../../support/editor';

const shell = (page: Page, id: string) => page.locator(`[data-block-id="${id}"]`);

const outlineOf = (block: Locator) =>
  block.evaluate((element) => {
    const { outlineStyle, outlineWidth, outlineColor } = getComputedStyle(element);
    return { style: outlineStyle, width: Number.parseFloat(outlineWidth), color: outlineColor };
  });

async function selectCalloutAndToggle(page: Page) {
  await openEditor(page, 'text');
  await page.getByRole('textbox', { name: 'Callout, warning' }).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+ArrowDown');
  for (const id of ['c', 't']) await expect(shell(page, id)).toHaveAttribute('data-selected', 'true');
}

test.describe('with forced colours', () => {
  test.beforeEach(({ page }) => page.emulateMedia({ forcedColors: 'active' }));

  test('every selected block keeps an outline and the others have none', async ({ page }) => {
    await selectCalloutAndToggle(page);
    for (const id of ['c', 't']) {
      const outline = await outlineOf(shell(page, id));
      expect(outline.style).not.toBe('none');
      expect(outline.width).toBeGreaterThan(0);
    }
    expect((await outlineOf(shell(page, 'q'))).style).toBe('none');
  });

  test('the outline takes a system colour where the emulation forces colours', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only the Chromium emulation forces colours, the others only match the query');
    await selectCalloutAndToggle(page);
    expect((await outlineOf(shell(page, 'c'))).color).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('the toggle chevron', () => {
  const turn = (page: Page) =>
    shell(page, 't').getByRole('button', { name: 'Toggle' }).locator('svg').evaluate((svg) => getComputedStyle(svg).transitionDuration);

  test('turns over 120 ms by default', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openEditor(page, 'text');
    expect(await turn(page)).toBe('0.12s');
  });

  test('turns at once when the reader asks for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openEditor(page, 'text');
    expect(await turn(page)).toBe('0s');
  });
});
