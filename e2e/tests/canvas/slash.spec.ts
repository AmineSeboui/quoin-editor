import { expect, test, type Locator, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { onlyHost } from '../../support/block';
import { openEditor } from '../../support/editor';
import { allMarkdown } from '../../support/markdown';

const listbox = (page: Page) => page.getByRole('listbox', { name: 'Commands' });
const popup = (page: Page) => listbox(page).locator('..');

const box = async (locator: Locator) => (await locator.boundingBox())!;

async function typeInEmptyParagraph(page: Page, text: string) {
  await openEditor(page, 'empty');
  await onlyHost(page).click();
  await page.keyboard.type(text);
}

test('a slash in an empty paragraph opens the menu under the line, without covering it', async ({ page }) => {
  await typeInEmptyParagraph(page, '/');
  await expect(listbox(page)).toBeVisible();
  const line = await box(onlyHost(page));
  const menu = await box(popup(page));
  expect(menu.y).toBeGreaterThanOrEqual(line.y + line.height);
  await expect(onlyHost(page)).toBeFocused();
  await expect(onlyHost(page)).toHaveAttribute('aria-expanded', 'true');
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

// Both rectangles are read in one pass, and only once three frames running agree on the gap. Read one at a time the
// two belong to different layouts, and read while the menu is still being moved the answer describes neither the place
// it left nor the one it is going to.
async function settledGapUnderLine(page: Page, line: Locator): Promise<number> {
  const [lineHandle, popupHandle] = [await line.elementHandle(), await popup(page).elementHandle()];
  return page.evaluate(
    async ([above, menu]) => {
      const gap = () => menu!.getBoundingClientRect().y - above!.getBoundingClientRect().bottom;
      let settled = 0;
      let previous = gap();
      for (let frame = 0; frame < 60 && settled < 2; frame++) {
        await new Promise(requestAnimationFrame);
        const current = gap();
        settled = current === previous ? settled + 1 : 0;
        previous = current;
      }
      return previous;
    },
    [lineHandle, popupHandle] as const,
  );
}

async function expectMenuToFollowScrolling(page: Page, line: Locator) {
  await page.locator('#root').evaluate((element) => element.scrollBy(0, 40));
  const gap = await settledGapUnderLine(page, line);
  expect(gap, 'the menu sits under its line').toBeGreaterThanOrEqual(0);
  expect(gap, 'the menu keeps up with its line').toBeLessThan(16);
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
  await expect.poll(() => allMarkdown(page)).toEqual(['- ']);
  await page.keyboard.type('Milk');
  await expect.poll(() => allMarkdown(page)).toEqual(['- Milk']);
});

test('a slash inserted without key events, as a virtual keyboard does, opens the menu', async ({ page }) => {
  await openEditor(page, 'empty');
  await onlyHost(page).click();
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
  await expect(onlyHost(page)).toBeFocused();
  await expect.poll(() => allMarkdown(page)).toEqual(['/hea']);
  await expect(onlyHost(page)).not.toHaveAttribute('aria-expanded');
});

test('clicking an option runs it and keeps the caret in the text', async ({ page }) => {
  await typeInEmptyParagraph(page, '/');
  await listbox(page).getByRole('option', { name: /Quote/ }).click();
  await expect(listbox(page)).toHaveCount(0);
  await expect.poll(() => allMarkdown(page)).toEqual(['> ']);
  await expect(onlyHost(page)).toBeFocused();
  await page.keyboard.type('Wise words');
  await expect.poll(() => allMarkdown(page)).toEqual(['> Wise words']);
});

test('the open menu and the text that controls it have no accessibility violations', async ({ page }) => {
  await typeInEmptyParagraph(page, '/');
  await expect(listbox(page)).toBeVisible();
  expect(await axeViolations(page, 'all', ['.quoin-editor', '[role="listbox"]'])).toEqual([]);
});
