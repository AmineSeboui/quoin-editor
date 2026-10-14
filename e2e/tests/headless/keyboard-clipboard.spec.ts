import { expect, test, type Page } from '@playwright/test';
import { caretAt, host, markdown, modelSelection, nativeSelection, openHeadless, selectText } from '../../support/headless';

const original = ['Alpha beta gamma', 'Delta epsilon', 'Zeta eta theta'];

test.beforeEach(async ({ page, context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openHeadless(page, 'three');
  await host(page, 0).click();
});

async function selectAllBlocks(page: Page) {
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+a');
  expect(await modelSelection(page)).toEqual({ kind: 'blocks', anchor: 'a', head: 'c' });
}

test.describe('the clipboard keys over a selection across blocks', () => {
  test('hold the selected text natively, so every browser fires copy and cut', async ({ page }) => {
    await selectText(page, [0, 6], [2, 4]);
    await expect.poll(() => nativeSelection(page)).toEqual({ collapsed: false, inSink: true, text: 'beta gamma Delta epsilon Zeta' });
  });

  test('Mod+X removes the range and Mod+V puts it back', async ({ page }) => {
    await selectText(page, [0, 6], [2, 4]);
    await page.keyboard.press('ControlOrMeta+x');
    await expect.poll(() => markdown(page)).toEqual(['Alpha  eta theta']);
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => markdown(page)).toEqual(original);
  });

  test('Mod+C leaves the document alone and Mod+V pastes the copied range elsewhere', async ({ page }) => {
    await selectText(page, [1, 0], [1, 5]);
    await page.keyboard.press('ControlOrMeta+c');
    expect(await markdown(page)).toEqual(original);
    await caretAt(page, 2, 0);
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => markdown(page)).toEqual(['Alpha beta gamma', 'Delta epsilon', 'DeltaZeta eta theta']);
  });
});

test.describe('the clipboard keys over a block range', () => {
  test('hold the blocks text natively in the sink', async ({ page }) => {
    await selectAllBlocks(page);
    await expect.poll(() => nativeSelection(page)).toEqual({
      collapsed: false,
      inSink: true,
      text: 'Alpha beta gamma Delta epsilon Zeta eta theta',
    });
    await expect(page.getByRole('textbox', { name: 'Selected content' })).toBeFocused();
  });

  test('Mod+X removes the blocks and Mod+V into the empty document puts them back', async ({ page }) => {
    await selectAllBlocks(page);
    await page.keyboard.press('ControlOrMeta+x');
    await expect.poll(() => markdown(page)).toEqual([]);
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => markdown(page)).toEqual(original);
  });

  test('Mod+C keeps the blocks and Mod+V over a block range replaces it', async ({ page }) => {
    await caretAt(page, 1, 0);
    await page.keyboard.press('Shift+End');
    await page.keyboard.press('ControlOrMeta+c');
    await selectAllBlocks(page);
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => markdown(page)).toEqual(['Delta epsilon']);
  });

  test('Mod+C on blocks copies them whole, so Mod+V after a collapse adds them again', async ({ page }) => {
    await selectAllBlocks(page);
    await page.keyboard.press('ControlOrMeta+c');
    expect(await markdown(page)).toEqual(original);
    await caretAt(page, 2, 14);
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(() => markdown(page)).toEqual([...original, ...original]);
  });
});
