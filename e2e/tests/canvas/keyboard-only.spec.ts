import { host } from '../../support/block';
import { expect, test, type Page } from '@playwright/test';
import { backThroughText, forward, onThroughText } from '../../support/direction';
import { blocks, openEditor } from '../../support/editor';
import { markdownOrData } from '../../support/markdown';

const selectedOption = (page: Page) =>
  page.getByRole('listbox', { name: 'Commands' }).getByRole('option', { selected: true });
const focusInEditor = (page: Page) =>
  page.evaluate(() => document.querySelector('.quoin-editor')!.contains(document.activeElement));
const fieldBefore = (page: Page) => page.getByRole('textbox', { name: 'Before the editor' });
const fieldAfter = (page: Page) => page.getByRole('textbox', { name: 'After the editor' });

// Shift+Tab from the first control of a page leaves focus where it is in Firefox, so the page gets a control before the
// editor for Shift+Tab out of it to land on.
const addFieldBefore = (page: Page) =>
  page.evaluate(() => {
    const field = document.createElement('input');
    field.setAttribute('aria-label', 'Before the editor');
    document.body.prepend(field);
  });

async function press(page: Page, key: string, times: number) {
  for (let i = 0; i < times; i++) await page.keyboard.press(key);
}

// Walks the menu with the arrow key, as a writer on the keyboard does, without pinning the test to the order of the
// commands. Bounded by the number of options, so a name that is not there fails saying so rather than pressing for ever.
async function arrowTo(page: Page, name: string) {
  const options = page.getByRole('listbox', { name: 'Commands' }).getByRole('option');
  for (let left = await options.count(); left > 0; left--) {
    if (((await selectedOption(page).textContent()) ?? '').includes(name)) return;
    await page.keyboard.press('ArrowDown');
  }
  throw new Error(`The commands menu has no ${name}`);
}

test('an author builds the same document with the keyboard alone, and leaves the editor with Escape then Tab', async ({
  page,
}) => {
  await openEditor(page, 'empty');
  await addFieldBefore(page);
  await page.keyboard.press('Tab');
  await expect(fieldBefore(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Paragraph' })).toBeFocused();
  await page.keyboard.type('# Groceries');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Buy fresh bread');

  // From the end of the line Shift walks back the same way in every browser, where an arrow alone does not on a right
  // to left page, and a selection of left to right words collapses to its start on the left arrow.
  await press(page, `Shift+${backThroughText(true)}`, ' bread'.length);
  await page.keyboard.press('ArrowLeft');
  await press(page, `Shift+${backThroughText(true)}`, 'fresh'.length);
  await page.keyboard.press('Alt+F10');
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  await expect(toolbar.getByRole('button', { name: 'Turn into' })).toBeFocused();
  await page.keyboard.press(forward());
  await expect(toolbar.getByRole('button', { name: 'Bold', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => markdownOrData(page)).toEqual(['# Groceries', 'Buy **fresh** bread']);
  await page.keyboard.press('Escape');

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press(onThroughText());
  await press(page, `Shift+${onThroughText(true)}`, 'bread'.length);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('textbox', { name: 'Link address' })).toBeFocused();
  await page.keyboard.type('https://bread.example');
  await page.keyboard.press('Enter');
  await expect.poll(() => markdownOrData(page)).toEqual(['# Groceries', 'Buy **fresh** [bread](https://bread.example)']);
  await expect(page.getByRole('textbox', { name: 'Paragraph' })).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/');
  await expect(selectedOption(page)).toContainText('Text');
  await arrowTo(page, 'Bulleted list');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Milk');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Eggs');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/');
  await arrowTo(page, 'Callout');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Shops close at six');
  await expect.poll(() => markdownOrData(page)).toEqual([
    '# Groceries',
    'Buy **fresh** [bread](https://bread.example)',
    '- Milk',
    '- Eggs',
    { tone: 'info', body: 'Shops close at six' },
  ]);
  const [title, paragraph, milk, eggs, callout] = (await blocks(page)).map((block) => block.id);

  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ControlOrMeta+Shift+ArrowUp');
  await expect.poll(async () => (await blocks(page)).map((block) => block.id)).toEqual([title, paragraph, eggs, milk, callout]);
  await page.keyboard.press('ControlOrMeta+/');
  await expect(page.getByRole('menu')).toHaveAccessibleName('Bulleted list block menu');
  await expect(page.getByRole('menuitem', { name: 'Turn into' })).toBeFocused();
  for (const name of ['Color', 'Duplicate']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name })).toBeFocused();
  }
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect.poll(async () => (await markdownOrData(page)).length).toBe(6);
  await expect(host(page, (await blocks(page))[3].id)).toBeFocused();

  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await blocks(page)).map((block) => block.id)).toEqual([title, paragraph, milk, eggs, callout]);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect.poll(() => blocks(page)).toStrictEqual([
    { id: title, type: 'MARKDOWN', data: { markdown: '# Groceries' } },
    { id: paragraph, type: 'MARKDOWN', data: { markdown: 'Buy **fresh** [bread](https://bread.example)' } },
    { id: eggs, type: 'MARKDOWN', data: { markdown: '- Eggs' } },
    { id: milk, type: 'MARKDOWN', data: { markdown: '- Milk' } },
    { id: callout, type: 'CALLOUT', data: { tone: 'info', body: 'Shops close at six' } },
  ]);

  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await expect(fieldAfter(page)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => focusInEditor(page)).toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect(fieldBefore(page)).toBeFocused();
});
