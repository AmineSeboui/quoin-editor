import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { blocks, openEditor } from '../../support/editor';

const listbox = (page: Page) => page.getByRole('listbox', { name: 'Commands' });
const popup = (page: Page) => listbox(page).locator('..');
const host = (page: Page) => page.locator('[data-quoin-host]').first();
const markdown = async (page: Page) => (await blocks(page)).map((block) => block.data.markdown);

const box = async (locator: Locator) => (await locator.boundingBox())!;

async function typeInEmptyParagraph(page: Page, text: string) {
  await openEditor(page, 'empty');
  await host(page).click();
  await page.keyboard.type(text);
}

test('a slash in an empty paragraph opens the menu under the line, without covering it', async ({ page }) => {
  await typeInEmptyParagraph(page, '/');
  await expect(listbox(page)).toBeVisible();
  const line = await box(host(page));
  const menu = await box(popup(page));
  expect(menu.y).toBeGreaterThanOrEqual(line.y + line.height);
  await expect(host(page)).toBeFocused();
  await expect(host(page)).toHaveAttribute('aria-expanded', 'true');
});

test('the menu opens above a line near the bottom of the window', async ({ page }) => {
  await openEditor(page, 'text');
  const paragraph = page.locator('[data-block-id="e"] [data-quoin-host]');
  const line = await box(paragraph);
  await page.setViewportSize({ width: 800, height: Math.ceil(line.y + line.height + 120) });
  await paragraph.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' /');
  await expect(listbox(page)).toBeVisible();
  const menu = await box(popup(page));
  const moved = await box(paragraph);
  expect(menu.y + menu.height).toBeLessThanOrEqual(moved.y);
});

const scrollingRoot = (page: Page) =>
  page.locator('#root').evaluate((element) => Object.assign(element.style, { height: '320px', overflowY: 'auto' }));

async function expectMenuToFollowScrolling(page: Page, line: Locator) {
  const gapUnderLine = async () => {
    const lineBox = await box(line);
    return (await box(popup(page))).y - (lineBox.y + lineBox.height);
  };
  await page.locator('#root').evaluate((element) => element.scrollBy(0, 40));
  await expect.poll(gapUnderLine).toBeLessThan(16);
  expect(await gapUnderLine()).toBeGreaterThanOrEqual(0);
}

test('the menu follows its line when the editor scrolls inside a container', async ({ page }) => {
  await openEditor(page, 'text');
  await scrollingRoot(page);
  const paragraph = page.locator('[data-block-id="r"] [data-quoin-host]');
  await paragraph.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' /');
  await expect(listbox(page)).toBeVisible();
  await expectMenuToFollowScrolling(page, paragraph);
});

test('the menu the gutter + opens follows its new line when the editor scrolls inside a container', async ({ page }) => {
  await openEditor(page, 'text');
  await scrollingRoot(page);
  await page.locator('[data-block-id="r"] [data-quoin-host]').hover();
  await page.getByRole('button', { name: 'Add block below' }).click();
  await expect(listbox(page)).toBeVisible();
  await expectMenuToFollowScrolling(page, page.locator('[data-quoin-host][aria-expanded="true"]'));
});

test('typing a query and Enter turns the paragraph into the chosen block', async ({ page }) => {
  await typeInEmptyParagraph(page, '/bul');
  await expect(listbox(page).getByRole('option', { selected: true })).toContainText('Bulleted list');
  await page.keyboard.press('Enter');
  await expect(listbox(page)).toHaveCount(0);
  await expect.poll(() => markdown(page)).toEqual(['- ']);
  await page.keyboard.type('Milk');
  await expect.poll(() => markdown(page)).toEqual(['- Milk']);
});

test('a slash inserted without key events, as a virtual keyboard does, opens the menu', async ({ page }) => {
  await openEditor(page, 'empty');
  await host(page).click();
  await page.keyboard.insertText('/');
  await expect(listbox(page)).toBeVisible();
  await page.keyboard.insertText('h2');
  await expect(listbox(page).getByRole('option', { selected: true })).toContainText('Heading 2');
});

test('Escape closes the menu and keeps the slash and the query as text', async ({ page }) => {
  await typeInEmptyParagraph(page, '/hea');
  await expect(listbox(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(listbox(page)).toHaveCount(0);
  await expect(host(page)).toBeFocused();
  await expect.poll(() => markdown(page)).toEqual(['/hea']);
  await expect(host(page)).not.toHaveAttribute('aria-expanded');
});

test('clicking an option runs it and keeps the caret in the text', async ({ page }) => {
  await typeInEmptyParagraph(page, '/');
  await listbox(page).getByRole('option', { name: /Quote/ }).click();
  await expect(listbox(page)).toHaveCount(0);
  await expect.poll(() => markdown(page)).toEqual(['> ']);
  await expect(host(page)).toBeFocused();
  await page.keyboard.type('Wise words');
  await expect.poll(() => markdown(page)).toEqual(['> Wise words']);
});

test('the open menu and the text that controls it have no accessibility violations', async ({ page }) => {
  await typeInEmptyParagraph(page, '/');
  await expect(listbox(page)).toBeVisible();
  // Contrast is measured once the menu has faded in: half way, its text is half as dark as it will be.
  await popup(page).evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  const { violations } = await new AxeBuilder({ page }).include('.quoin-editor').include('[role="listbox"]').analyze();
  expect(violations.map((violation) => violation.id)).toEqual([]);
});
