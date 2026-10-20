import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const types = async (page: Page) => (await blocks(page)).map((block) => block.type);
const sink = (page: Page) => page.getByRole('textbox', { name: 'Selected content' });

test.beforeEach(async ({ page, context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openEditor(page, 'image');
});

async function caretAtEndOfLastLine(page: Page) {
  await page.getByRole('textbox', { name: 'Paragraph' }).last().click();
  await page.keyboard.press('End');
}

const clicks: Record<string, (page: Page) => Promise<void>> = {
  image: (page) => page.getByRole('img', { name: 'A red square' }).click(),
  divider: (page) => page.getByRole('separator').click(),
};
const selected: Record<string, string> = { image: 'img', divider: 'd' };

for (const [name, click] of Object.entries(clicks)) {
  test(`a clicked ${name} is copied with Mod+C and pasted elsewhere with Mod+V`, async ({ page }) => {
    await click(page);
    await expect(page.locator(`[data-block-id="${selected[name]}"]`)).toHaveAttribute('data-selected', 'true');
    await expect(sink(page)).toBeFocused();
    await page.keyboard.press('ControlOrMeta+c');
    await caretAtEndOfLastLine(page);
    await page.keyboard.press('ControlOrMeta+v');
    const type = name === 'image' ? 'IMAGE' : 'DIVIDER';
    await expect.poll(async () => (await types(page)).filter((each) => each === type)).toHaveLength(2);
  });

  test(`a clicked ${name} is cut with Mod+X and brought back with Mod+Z`, async ({ page }) => {
    const before = await types(page);
    await click(page);
    await page.keyboard.press('ControlOrMeta+x');
    await expect.poll(() => types(page)).toHaveLength(before.length - 1);
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => types(page)).toEqual(before);
  });
}
