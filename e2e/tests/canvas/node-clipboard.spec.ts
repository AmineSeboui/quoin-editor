import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const types = async (page: Page) => (await blocks(page)).map((block) => block.type);
const sink = (page: Page) => page.locator('[data-quoin-sink]');

test.beforeEach(async ({ context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

async function caretAtEndOfLastLine(page: Page) {
  await page.getByRole('textbox', { name: 'Paragraph' }).last().click();
  await page.keyboard.press('End');
}

type Case = { doc: string; selected: string; type: string; click(page: Page): Promise<void> };

const cases: Record<string, Case> = {
  image: { doc: 'image', selected: 'img', type: 'IMAGE', click: (page) => page.getByRole('img', { name: 'A red square' }).click() },
  divider: { doc: 'image', selected: 'd', type: 'DIVIDER', click: (page) => page.getByRole('separator').click() },
  'file card': {
    doc: 'file',
    selected: 'f',
    type: 'FILE',
    click: (page) => page.locator('[data-block-id="f"]').getByText('notes.pdf').click(),
  },
};

for (const [name, { doc, selected, type, click }] of Object.entries(cases)) {
  test(`a clicked ${name} is copied with Mod+C and pasted elsewhere with Mod+V`, async ({ page }) => {
    await openEditor(page, doc);
    await click(page);
    await expect(page.locator(`[data-block-id="${selected}"]`)).toHaveAttribute('data-selected', 'true');
    await expect(sink(page)).toBeFocused();
    const before = (await types(page)).filter((each) => each === type).length;
    await page.keyboard.press('ControlOrMeta+c');
    await caretAtEndOfLastLine(page);
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(async () => (await types(page)).filter((each) => each === type)).toHaveLength(before + 1);
  });

  test(`a clicked ${name} is cut with Mod+X and brought back with Mod+Z`, async ({ page }) => {
    await openEditor(page, doc);
    const before = await types(page);
    await click(page);
    await page.keyboard.press('ControlOrMeta+x');
    await expect.poll(() => types(page)).toHaveLength(before.length - 1);
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => types(page)).toEqual(before);
  });
}
