import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const listbox = (page: Page) => page.getByRole('listbox', { name: 'Commands' });
const paragraph = (page: Page) => page.locator('[data-block-id="b"] [data-quoin-host]');
const markdown = async (page: Page) => (await blocks(page)).map((block) => String(block.data.markdown));

async function openSlashMenu(page: Page) {
  await openEditor(page, 'sample');
  await paragraph(page).click();
  await page.keyboard.type(' /x');
  await expect(listbox(page)).toBeVisible();
}

test.describe('an overlay opened by key while the slash menu is open', () => {
  test('Mod+K opens the link popover, which keeps focus and takes the typed address, and the slash menu closes', async ({
    page,
  }) => {
    await openSlashMenu(page);
    const before = await markdown(page);
    await page.keyboard.press('ControlOrMeta+k');
    const address = page.getByRole('textbox', { name: 'Link address' });
    await expect(address).toBeFocused();
    await expect(listbox(page)).toHaveCount(0);
    await page.keyboard.type('example.com');
    await expect(address).toHaveValue('example.com');
    expect(await markdown(page)).toEqual(before);
  });

  test('Mod+/ opens the block menu, which keeps focus, and the slash menu closes', async ({ page }) => {
    await openSlashMenu(page);
    await page.keyboard.press('ControlOrMeta+/');
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Turn into' })).toBeFocused();
    await expect(listbox(page)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(paragraph(page)).toBeFocused();
    await expect(listbox(page)).toHaveCount(0);
  });
});

test('clicking the handle while the slash menu is open leaves only the block menu, and Escape leaves nothing open', async ({
  page,
}) => {
  await openSlashMenu(page);
  await paragraph(page).hover();
  await page.getByRole('button', { name: 'Drag to move, click for options' }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(listbox(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(paragraph(page)).toBeFocused();
  await expect(listbox(page)).toHaveCount(0);
  await expect(paragraph(page)).not.toHaveAttribute('aria-expanded');
});

test('the gutter + while the slash menu is open moves the menu to the new line', async ({ page }) => {
  await openSlashMenu(page);
  await paragraph(page).hover();
  await page.getByRole('button', { name: 'Add block below' }).click();
  await expect(listbox(page)).toHaveCount(1);
  await expect(page.locator('[data-quoin-host][aria-expanded="true"]')).toHaveText('/');
  await expect.poll(() => markdown(page)).toEqual(['# Title', 'First paragraph. /x', '/']);
});
