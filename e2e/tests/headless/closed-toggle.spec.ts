import { expect, test, type Page } from '@playwright/test';
import { domCaret, host, modelMarkdown, modelSelection, openHeadless } from '../../support/headless';

const visible = (page: Page) =>
  page.evaluate(() => Array.from(document.querySelectorAll('[data-quoin-block]'), (block) => block.textContent));
const changes = (page: Page) => page.evaluate(() => window.__quoin.changes);
const head = async (page: Page) => ((await modelSelection(page)) as { head: { block: string; offset: number } }).head;

test('closing a toggle over the caret puts the caret at the end of its text, so keys never edit the hidden child', async ({
  page,
}) => {
  await openHeadless(page, 'closed');
  const chevron = page.getByRole('button', { name: 'Toggle' });
  await chevron.click();
  await page.locator('[data-block-id="c"] [data-quoin-host]').click();
  await page.keyboard.press('End');
  await expect.poll(() => head(page)).toEqual({ block: 'c', region: 'text', offset: 5 });
  const opened = await changes(page);
  await chevron.click();
  await expect.poll(() => head(page)).toEqual({ block: 't', region: 'text', offset: 1 });
  await expect(host(page, 1)).toBeFocused();
  await expect.poll(() => domCaret(page)).toEqual({ block: 't', offset: 1 });
  expect(await changes(page)).toBe(opened + 1);
  const backspace = async () => {
    const [before, count] = [await visible(page), await changes(page)];
    await page.keyboard.press('Backspace');
    await expect.poll(() => modelMarkdown(page)).toEqual(['one', '', 'child']);
    expect(await visible(page)).not.toEqual(before);
    expect(await changes(page)).toBe(count + 1);
  };
  await backspace();
  await backspace();
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => head(page)).toMatchObject({ block: 'a' });
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => head(page)).toMatchObject({ block: 't' });
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => head(page)).toMatchObject({ block: 'c' });
  await page.keyboard.type('!');
  const child = async () => (await modelMarkdown(page))[2];
  await expect.poll(async () => [(await child()).length, (await child()).replace('!', '')]).toEqual([6, 'child']);
});
