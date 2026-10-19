import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const shell = (page: Page, id: string) => page.locator(`[data-block-id="${id}"]`);
const host = (page: Page, id: string) => shell(page, id).locator('[data-quoin-host]');
const handle = (page: Page) => page.getByRole('button', { name: 'Drag to move, click for options' });
const markdown = async (page: Page) =>
  (await blocks(page)).map((block) => (block.type === 'MARKDOWN' ? block.data.markdown : block.data));

async function chooseCommand(page: Page, query: string, name: string) {
  await page.keyboard.type(`/${query}`);
  await expect(page.getByRole('listbox', { name: 'Commands' }).getByRole('option', { selected: true })).toContainText(name);
  await page.keyboard.press('Enter');
}

async function dragBelow(page: Page, id: string, target: string) {
  await host(page, id).hover();
  const grip = (await handle(page).boundingBox())!;
  const start = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y + 6, { steps: 2 });
  const below = (await shell(page, target).boundingBox())!;
  await page.mouse.move(start.x, below.y + below.height, { steps: 8 });
  await expect(page.locator('[data-quoin-drop-line]')).toBeVisible();
  await page.mouse.up();
}

test('an author writes, formats, reorders, duplicates and undoes, and the document holds exactly what they meant', async ({
  page,
}) => {
  await openEditor(page, 'empty');
  await page.getByRole('textbox', { name: 'Paragraph' }).click();
  await page.keyboard.type('# Groceries');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Buy fresh bread');
  for (let i = 0; i < 'bread'.length; i++) await page.keyboard.press('Shift+ArrowLeft');
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  await toolbar.getByRole('button', { name: 'Bold', exact: true }).click();
  await expect.poll(() => markdown(page)).toEqual(['# Groceries', 'Buy fresh **bread**']);

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await chooseCommand(page, 'bul', 'Bulleted list');
  await page.keyboard.type('Milk');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Eggs');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await chooseCommand(page, 'callout', 'Callout');
  await page.keyboard.type('Shops close at six');
  await expect.poll(() => markdown(page)).toEqual([
    '# Groceries',
    'Buy fresh **bread**',
    '- Milk',
    '- Eggs',
    { tone: 'info', body: 'Shops close at six' },
  ]);

  const [title, paragraph, milk, eggs, callout] = (await blocks(page)).map((block) => block.id);
  await dragBelow(page, eggs, paragraph);
  await expect.poll(async () => (await blocks(page)).map((block) => block.id)).toEqual([title, paragraph, eggs, milk, callout]);

  await host(page, callout).hover();
  await handle(page).click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect.poll(async () => (await blocks(page)).length).toBe(6);
  const duplicate = shell(page, (await blocks(page))[5].id);
  await expect(duplicate).toHaveAttribute('data-selected', 'true');
  await expect(page.getByRole('textbox', { name: 'Selected content' })).toBeFocused();

  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await blocks(page)).map((block) => block.id)).toEqual([title, paragraph, milk, eggs, callout]);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect.poll(() => blocks(page)).toStrictEqual([
    { id: title, type: 'MARKDOWN', data: { markdown: '# Groceries' } },
    { id: paragraph, type: 'MARKDOWN', data: { markdown: 'Buy fresh **bread**' } },
    { id: eggs, type: 'MARKDOWN', data: { markdown: '- Eggs' } },
    { id: milk, type: 'MARKDOWN', data: { markdown: '- Milk' } },
    { id: callout, type: 'CALLOUT', data: { tone: 'info', body: 'Shops close at six' } },
  ]);
});
