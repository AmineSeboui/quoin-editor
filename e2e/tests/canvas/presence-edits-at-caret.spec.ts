import { expect, test, type Page } from '@playwright/test';
import { host } from '../../support/block';
import { caretSettled, openEditor } from '../../support/editor';
import { allMarkdown } from '../../support/markdown';

const END = 'First paragraph.'.length;

// Two pages of one browser context sharing a document through the harness's BroadcastChannel provider.
async function twoPages(page: Page) {
  await openEditor(page, 'sample', 'collab=presence&user=Ada&color=%23b91c1c');
  const bea = await page.context().newPage();
  await openEditor(bea, 'empty', 'collab=presence&user=Bea&color=%231d4ed8&seed=0');
  await expect.poll(() => allMarkdown(bea)).toEqual(await allMarkdown(page));
  return bea;
}

async function caretAt(page: Page, block: string, offset: number) {
  await page.evaluate((at) => window.__quoin.controller!.focus({ ...at, region: 'text' }), { block, offset });
  await caretSettled(page, host(page, block));
}

// Where the browser draws the caret: the block it is in and the characters of its host before it.
const domCaret = (page: Page) =>
  page.evaluate(() => {
    const selection = document.getSelection()!;
    const node = selection.focusNode!;
    const shell = (node instanceof Element ? node : node.parentElement)!.closest('[data-block-id]')!;
    const range = document.createRange();
    range.setStart(shell.querySelector('[data-quoin-host]')!, 0);
    range.setEnd(node, selection.focusOffset);
    return { block: shell.getAttribute('data-block-id'), offset: range.toString().length };
  });

test.describe('a collaborator editing exactly at the caret', () => {
  test('types after it, and the next key typed here lands before their text', async ({ page }) => {
    const bea = await twoPages(page);
    await caretAt(page, 'b', END);
    await caretAt(bea, 'b', END);
    await bea.keyboard.type(' Zed');
    await expect.poll(() => allMarkdown(page)).toEqual(['# Title', 'First paragraph. Zed']);
    await expect.poll(() => domCaret(page)).toEqual({ block: 'b', offset: END });
    await page.keyboard.type('Q');
    await expect.poll(() => allMarkdown(bea)).toEqual(['# Title', 'First paragraph.Q Zed']);
  });

  test('presses Enter there without taking the caret into the new block', async ({ page }) => {
    const bea = await twoPages(page);
    await caretAt(page, 'b', END);
    await caretAt(bea, 'b', END);
    await bea.keyboard.press('Enter');
    await bea.keyboard.type('/table');
    await expect.poll(() => allMarkdown(page)).toEqual(['# Title', 'First paragraph.', '/table']);
    await expect.poll(() => domCaret(page)).toEqual({ block: 'b', offset: END });
    await expect(page.getByRole('listbox', { name: 'Commands' })).toHaveCount(0);
    await page.keyboard.type('Q');
    await expect.poll(() => allMarkdown(bea)).toEqual(['# Title', 'First paragraph.Q', '/table']);
  });
});
