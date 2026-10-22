import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, caretSettled, openEditor } from '../../support/editor';
import { caretOf, onCharacter } from '../../support/presence';

const hostOf = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const markdown = async (page: Page, id: string) =>
  String((await blocks(page)).find((block) => block.id === id)?.data.markdown);
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Text formatting' });
const bar = (page: Page) => page.getByRole('group', { name: 'AI response' });
const rail = (page: Page) => page.getByRole('list', { name: 'Comments' });
const changes = (page: Page) => page.evaluate(() => window.__quoin.changes);
const ai = {
  push: (page: Page, chunk: string) => page.evaluate((text) => window.__quoinAi!.push(text), chunk),
  end: (page: Page) => page.evaluate(() => window.__quoinAi!.end()),
};
const head = (page: Page) =>
  page.evaluate(() => {
    const selection = window.__quoin.controller!.editor.state.selection;
    return selection?.kind === 'text' ? selection.head : null;
  });

// Collaboration, presence, comments and AI on two pages of one browser context: the document and the awareness go
// through the harness's BroadcastChannel provider, and the threads through a comments host the pages share.
async function twoPages(page: Page) {
  const features = 'collab=together&comments=shared&ai=1';
  await openEditor(page, 'ai', `${features}&user=Ada%20Lovelace&color=%23b91c1c`);
  const bea = await page.context().newPage();
  await openEditor(bea, 'empty', `${features}&user=Bea&color=%231d4ed8&seed=0`);
  await expect.poll(() => markdown(bea, 'r')).toBe('Another paragraph after.');
  return bea;
}

async function selectFirstWord(page: Page, block: string) {
  await hostOf(page, block).dblclick({ position: { x: 6, y: 10 } });
  await caretSettled(page, hostOf(page, block));
  await expect(toolbar(page)).toBeVisible();
}

// Whether the caret a page draws for a collaborator sits on the character the collaborator's own page has it at.
async function caretWhereItIs(page: Page, name: string, of: Page) {
  const at = (await head(of))!;
  return onCharacter(page, name, at.block, at.offset);
}

async function askToImprove(page: Page, block: string) {
  await selectFirstWord(page, block);
  await toolbar(page).getByRole('button', { name: 'Ask AI' }).click();
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.keyboard.type('improve');
  await page.keyboard.press('Enter');
  await expect(bar(page).getByRole('button', { name: 'Stop' })).toBeFocused();
}

async function commentOnFirstWord(page: Page, block: string, body: string) {
  await selectFirstWord(page, block);
  await toolbar(page).getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Add a comment' })).toBeFocused();
  await page.keyboard.type(body);
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.getByRole('dialog').locator('ol').getByText(body)).toBeVisible();
}

test.describe('collaboration, presence, comments and AI together on two pages', () => {
  test('a comment made on one page while the other streams an answer reaches both, and the answer lands as one change', async ({
    page,
  }) => {
    const bea = await twoPages(page);
    await askToImprove(bea, 'r');
    await ai.push(bea, 'One **more**');
    await expect(bea.locator('.quoin-ai-ghost')).toHaveText('One more');

    await commentOnFirstWord(page, 'p', 'Sharper?');
    const anchored = '<span data-comment="ada-t1">Make</span> this sentence better.';
    await expect.poll(() => markdown(bea, 'p')).toBe(anchored);
    await expect(rail(bea).getByRole('button', { name: /^Make/ })).toContainText('1 comment');
    await expect(bea.locator('.quoin-ai-ghost')).toHaveText('One more');
    expect(await axeViolations(bea, 'all', '.quoin')).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(hostOf(page, 'p')).toBeFocused();
    await expect(caretOf(bea, 'Ada Lovelace')).toBeVisible();

    await ai.end(bea);
    await expect(bar(bea).getByRole('button', { name: 'Accept' })).toBeFocused();
    const before = await changes(page);
    await bea.keyboard.press('Enter');
    await expect(bar(bea)).toHaveCount(0);
    await expect.poll(() => markdown(page, 'r')).toBe('One **more** paragraph after.');
    await expect.poll(() => changes(page)).toBe(before + 1);
    expect(await markdown(page, 'p')).toBe(anchored);
    expect(await markdown(bea, 'r')).toBe('One **more** paragraph after.');

    await expect(caretOf(page, 'Bea')).toBeVisible();
    await expect.poll(() => caretWhereItIs(page, 'Bea', bea)).toBe(true);
    await expect.poll(() => caretWhereItIs(bea, 'Ada Lovelace', page)).toBe(true);
    expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
    expect(await axeViolations(bea, 'all', '.quoin')).toEqual([]);
    expect(await changes(page)).toBe(before + 1);
  });

  test('one undo takes an accepted answer back from both pages, and keeps the comment the other page made', async ({
    page,
  }) => {
    const bea = await twoPages(page);
    await commentOnFirstWord(bea, 'r', 'Why another?');
    const anchored = '<span data-comment="bea-t1">Another</span> paragraph after.';
    await expect.poll(() => markdown(page, 'r')).toBe(anchored);
    await rail(page).getByRole('button', { name: /^Another/ }).click();
    await expect(rail(page).getByRole('group', { name: 'Comment on "Another"' })).toContainText('Why another?');

    await askToImprove(page, 'p');
    await ai.push(page, 'Get');
    await ai.end(page);
    await page.keyboard.press('Enter');
    await expect.poll(() => markdown(bea, 'p')).toBe('Get this sentence better.');
    await expect(hostOf(page, 'p')).toBeFocused();
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => markdown(bea, 'p')).toBe('Make this sentence better.');
    expect(await markdown(bea, 'r')).toBe(anchored);
    await expect(caretOf(bea, 'Ada Lovelace')).toBeVisible();
    await expect.poll(() => caretWhereItIs(bea, 'Ada Lovelace', page)).toBe(true);
  });

  // The thread is portalled out of the canvas, so presence stops sharing the selection while it has focus and a
  // collaborator reading a comment looks to the others as if they had left.
  test.fixme('keeps showing the caret of a page whose focus is in a comment thread it opened', async ({ page }) => {
    const bea = await twoPages(page);
    await commentOnFirstWord(page, 'p', 'Sharper?');
    await expect(page.getByRole('textbox', { name: 'Reply' })).toBeFocused();
    await expect(caretOf(bea, 'Ada Lovelace')).toBeVisible();
    await expect.poll(() => caretWhereItIs(bea, 'Ada Lovelace', page)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(hostOf(page, 'p')).toBeFocused();
    await expect(caretOf(bea, 'Ada Lovelace')).toBeVisible();
  });

  test('keeps showing the caret of a page whose focus is in the bar of an answer it streams', async ({ page }) => {
    const bea = await twoPages(page);
    await askToImprove(page, 'p');
    await expect(caretOf(bea, 'Ada Lovelace')).toBeVisible();
    await ai.push(page, 'Get');
    await ai.end(page);
    await expect(bar(page).getByRole('button', { name: 'Accept' })).toBeFocused();
    await expect(caretOf(bea, 'Ada Lovelace')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(hostOf(page, 'p')).toBeFocused();
    await expect(caretOf(bea, 'Ada Lovelace')).toBeVisible();
  });
});
