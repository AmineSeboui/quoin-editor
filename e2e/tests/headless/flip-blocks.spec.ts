import { expect, test, type Page } from '@playwright/test';
import { caretAt, domCaret, host, markdown, modelSelection, openHeadless } from '../../support/headless';

const MOD_ENTER = 'ControlOrMeta+Enter';

const status = (page: Page) => page.getByRole('status');
const drawn = (page: Page) =>
  page.evaluate(() => Array.from(document.querySelectorAll('[data-quoin-block]'), (block) => block.getAttribute('data-block-id')));
const head = async (page: Page) => ((await modelSelection(page)) as { head: { block: string; offset: number } }).head;

test.describe('Mod+Enter on a task', () => {
  test('checks and unchecks the task that holds the caret, keeping the caret, and says what it became', async ({ page }) => {
    await openHeadless(page, 'flip');
    await caretAt(page, 1, 4);
    await page.keyboard.press(MOD_ENTER);
    await expect.poll(async () => (await markdown(page))[1]).toBe('- [x] a task');
    await expect(page.getByRole('checkbox', { name: 'Task' })).toHaveAttribute('aria-checked', 'true');
    await expect(status(page)).toHaveText('checked');
    await expect(host(page, 1)).toBeFocused();
    expect(await head(page)).toMatchObject({ block: 'k', offset: 4 });
    expect(await domCaret(page)).toEqual({ block: 'k', offset: 4 });

    await page.keyboard.press(MOD_ENTER);
    await expect.poll(async () => (await markdown(page))[1]).toBe('- [ ] a task');
    await expect(status(page)).toHaveText('unchecked');
    await page.keyboard.type('Z');
    await expect.poll(async () => (await markdown(page))[1]).toBe('- [ ] a taZsk');
  });

  test('is one undo step, so Mod+Z puts the box back', async ({ page }) => {
    await openHeadless(page, 'flip');
    await caretAt(page, 1, 4);
    await page.keyboard.press(MOD_ENTER);
    await expect.poll(async () => (await markdown(page))[1]).toBe('- [x] a task');
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(async () => (await markdown(page))[1]).toBe('- [ ] a task');
  });
});

test.describe('Mod+Enter on a toggle', () => {
  test('closes and opens the toggle that holds the caret, with the caret still in its text', async ({ page }) => {
    await openHeadless(page, 'flip');
    await caretAt(page, 2, 3);
    expect(await drawn(page)).toEqual(['p', 'k', 't', 'c', 's']);
    await page.keyboard.press(MOD_ENTER);
    await expect.poll(() => drawn(page)).toEqual(['p', 'k', 't', 's']);
    await expect(page.getByRole('button', { name: 'Toggle' })).toHaveAttribute('aria-expanded', 'false');
    await expect(status(page)).toHaveText('collapsed');
    await expect(host(page, 2)).toBeFocused();
    expect(await head(page)).toMatchObject({ block: 't', offset: 3 });
    expect(await domCaret(page)).toEqual({ block: 't', offset: 3 });

    await page.keyboard.press(MOD_ENTER);
    await expect.poll(() => drawn(page)).toEqual(['p', 'k', 't', 'c', 's']);
    await expect(status(page)).toHaveText('expanded');
    await page.keyboard.type('!');
    await expect.poll(() => page.evaluate(() => window.__quoin.controller!.editor.getBlocks()[2].data.markdown)).toBe('Tog!gle text');
  });

  test('lets a keyboard reach what a closed toggle holds: open it, then arrow into the child', async ({ page }) => {
    await openHeadless(page, 'closed');
    await host(page, 1).click();
    await page.keyboard.press('End');
    expect(await drawn(page)).toEqual(['a', 't']);
    await page.keyboard.press(MOD_ENTER);
    await expect.poll(() => drawn(page)).toEqual(['a', 't', 'c']);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => head(page)).toMatchObject({ block: 'c' });
  });
});

test.describe('Mod+Enter elsewhere', () => {
  test('is a no-op in a paragraph: no line break, no change, the caret stays', async ({ page }) => {
    await openHeadless(page, 'flip');
    await caretAt(page, 0, 2);
    const before = await markdown(page);
    await page.keyboard.press(MOD_ENTER);
    await page.keyboard.type('x');
    await expect.poll(async () => (await markdown(page))[0]).toBe('plxain');
    expect((await markdown(page)).length).toBe(before.length);
    expect(await status(page).textContent()).toBe('');
  });

  test('is a no-op in a block that sits under a toggle, which does not close', async ({ page }) => {
    await openHeadless(page, 'flip');
    await caretAt(page, 3, 2);
    await page.keyboard.press(MOD_ENTER);
    await page.keyboard.type('x');
    await expect.poll(async () => (await markdown(page))[3]).toBe('chxild');
    expect(await drawn(page)).toEqual(['p', 'k', 't', 'c', 's']);
  });

  test('is a no-op over a block selection', async ({ page }) => {
    await openHeadless(page, 'flip');
    await caretAt(page, 1, 2);
    await page.keyboard.press('Escape');
    await expect.poll(() => modelSelection(page)).toMatchObject({ kind: 'blocks', anchor: 'k' });
    await page.keyboard.press(MOD_ENTER);
    expect((await markdown(page))[1]).toBe('- [ ] a task');
    expect(await modelSelection(page)).toMatchObject({ kind: 'blocks', anchor: 'k' });
  });
});
