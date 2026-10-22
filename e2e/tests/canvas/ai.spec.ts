import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, caretSettled, openEditor } from '../../support/editor';

const hostOf = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const markdown = async (page: Page, id: string) =>
  String((await blocks(page)).find((block) => block.id === id)?.data.markdown);
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Text formatting' });
const field = (page: Page) => page.getByRole('combobox');
const bar = (page: Page) => page.getByRole('group', { name: 'AI response' });
const ghost = (page: Page) => page.locator('.quoin-ai-ghost');
const ai = {
  push: (page: Page, chunk: string) => page.evaluate((text) => window.__quoinAi!.push(text), chunk),
  end: (page: Page) => page.evaluate(() => window.__quoinAi!.end()),
  fail: (page: Page, message: string) => page.evaluate((text) => window.__quoinAi!.fail(text), message),
  requests: (page: Page) => page.evaluate(() => window.__quoinAi!.requests),
  aborted: (page: Page) => page.evaluate(() => window.__quoinAi!.aborted),
};

async function askAboutFirstWord(page: Page, typed: string) {
  await openEditor(page, 'ai', 'ai=1');
  await hostOf(page, 'p').dblclick({ position: { x: 6, y: 10 } });
  await expect(toolbar(page)).toBeVisible();
  await toolbar(page).getByRole('button', { name: 'Ask AI' }).click();
  await expect(field(page)).toBeFocused();
  await page.keyboard.type(typed);
  await page.keyboard.press('Enter');
}

test('streams an answer about the selected text into the document, and Accept applies it in one undo step', async ({
  page,
}) => {
  await openEditor(page, 'ai', 'ai=1');
  await hostOf(page, 'p').dblclick({ position: { x: 6, y: 10 } });
  await toolbar(page).getByRole('button', { name: 'Ask AI' }).click();
  await expect(page.getByRole('listbox', { name: 'AI actions' })).toBeVisible();
  expect(await axeViolations(page, 'all', '[role="dialog"]')).toEqual([]);
  await page.keyboard.type('improve');
  await page.keyboard.press('Enter');
  await expect.poll(() => ai.requests(page)).toEqual([
    expect.objectContaining({ action: 'improve', selection: 'Make' }),
  ]);
  await expect(bar(page).getByRole('button', { name: 'Stop' })).toBeFocused();
  await expect(bar(page)).toContainText('Writing');

  await ai.push(page, 'Get **ma');
  await expect(ghost(page)).toHaveText('Get ma');
  await expect(ghost(page).locator('strong')).toHaveText('ma');
  await expect(hostOf(page, 'p').locator('.quoin-ai-replaced')).toHaveText('Make');
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  await ai.push(page, 'king**');
  await ai.end(page);
  await expect(bar(page).getByRole('button', { name: 'Accept' })).toBeFocused();
  expect(await markdown(page, 'p')).toBe('Make this sentence better.');

  await page.keyboard.press('Enter');
  await expect.poll(() => markdown(page, 'p')).toBe('Get **making** this sentence better.');
  await expect(ghost(page)).toHaveCount(0);
  await expect(hostOf(page, 'p')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => markdown(page, 'p')).toBe('Make this sentence better.');
});

test('keeps what streamed on Stop, aborting the stream, and Discard leaves the document as it was', async ({
  page,
}) => {
  await openEditor(page, 'ai', 'ai=1');
  await hostOf(page, 'r').click();
  await caretSettled(page, hostOf(page, 'r'));
  await page.keyboard.press('End');
  await page.keyboard.type(' /continue');
  await page.keyboard.press('Enter');
  await expect.poll(() => ai.requests(page)).toEqual([expect.objectContaining({ action: 'continue' })]);
  await ai.push(page, 'More words');
  await expect(ghost(page)).toHaveText('More words');
  await bar(page).getByRole('button', { name: 'Stop' }).click();
  await expect(bar(page)).toContainText('Stopped');
  await expect.poll(() => ai.aborted(page)).toBe(1);
  await ai.push(page, ' too late');
  await expect(ghost(page)).toHaveText('More words');
  await bar(page).getByRole('button', { name: 'Discard' }).click();
  await expect(ghost(page)).toHaveCount(0);
  expect(await markdown(page, 'r')).toBe('Another paragraph after.&#32;');
});

test('applies the answer where edits made while it streamed moved its text, including those of a collaborator', async ({
  page,
}) => {
  await askAboutFirstWord(page, 'fix');
  await ai.push(page, 'Mke');
  await expect(ghost(page)).toHaveText('Mke');
  await hostOf(page, 'r').click({ position: { x: 1, y: 10 } });
  await caretSettled(page, hostOf(page, 'r'));
  await page.keyboard.type('So, ');
  await page.evaluate(() => window.__quoin.removeRemotely?.('q'));
  await ai.push(page, ' it');
  await ai.end(page);
  await expect(hostOf(page, 'r')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(bar(page).getByRole('button', { name: 'Accept' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => markdown(page, 'p')).toBe('Mke it this sentence better.');
  expect(await markdown(page, 'r')).toBe('So, Another paragraph after.');
});

test('shows a failed answer inline with Retry, which asks the same again', async ({ page }) => {
  await askAboutFirstWord(page, 'shorter');
  await ai.fail(page, 'quota');
  await expect(bar(page).getByRole('alert')).toHaveText('AI could not answer');
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  await bar(page).getByRole('button', { name: 'Retry' }).click();
  await expect.poll(async () => (await ai.requests(page)).length).toBe(2);
  const [first, second] = await ai.requests(page);
  expect(second).toEqual(first);
  await ai.push(page, 'Do');
  await ai.end(page);
  await bar(page).getByRole('button', { name: 'Accept' }).click();
  await expect.poll(() => markdown(page, 'p')).toBe('Do this sentence better.');
});

for (const second of ['Space', 'Escape'] as const) {
  test(`opens the AI menu on a Space on an empty line, and a ${second} after it types a plain space`, async ({
    page,
  }) => {
    await openEditor(page, 'ai', 'ai=1');
    await hostOf(page, 'q').click();
    await caretSettled(page, hostOf(page, 'q'));
    await page.keyboard.press('Space');
    await expect(field(page)).toBeFocused();
    await expect(page.getByRole('option')).toHaveText(['Continue writing', 'Summarize']);
    await page.keyboard.press(second);
    await expect(field(page)).toHaveCount(0);
    await expect(hostOf(page, 'q')).toBeFocused();
    await page.keyboard.press('Space');
    await expect.poll(() => markdown(page, 'q')).toBe('&#32;&#32;');
    await expect(field(page)).toHaveCount(0);
  });
}

test('opens the AI menu about a block from its block menu, with focus in the field', async ({ page }) => {
  await openEditor(page, 'ai', 'ai=1');
  await hostOf(page, 'r').click();
  await caretSettled(page, hostOf(page, 'r'));
  await page.keyboard.press('ControlOrMeta+/');
  await page.getByRole('menu').getByRole('menuitem', { name: 'Ask AI' }).click();
  await expect(field(page)).toBeFocused();
  await page.keyboard.type('summ');
  await page.keyboard.press('Enter');
  await expect.poll(() => ai.requests(page)).toEqual([
    expect.objectContaining({ action: 'summarize', selection: 'Another paragraph after.' }),
  ]);
  await expect(bar(page).getByRole('button', { name: 'Stop' })).toBeFocused();
});
