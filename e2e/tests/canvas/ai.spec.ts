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

const caretOffset = (page: Page) =>
  page.evaluate(() => {
    const selection = window.__quoin.controller!.editor.state.selection;
    return selection?.kind === 'text' ? selection.head.offset : -1;
  });

async function walk(page: Page, key: string, times: number): Promise<number[]> {
  const offsets: number[] = [];
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 20))));
    offsets.push(await caretOffset(page));
  }
  return offsets;
}

test('moves the caret one character a press across a word an answer would replace', async ({ page }) => {
  await askAboutFirstWord(page, 'improve');
  await ai.push(page, 'Get');
  await ai.end(page);
  await expect(ghost(page)).toHaveText('Get');
  await hostOf(page, 'p').click({ position: { x: 1, y: 8 } });
  await caretSettled(page, hostOf(page, 'p'));
  expect(await caretOffset(page)).toBe(0);
  expect(await walk(page, 'ArrowRight', 6)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(await walk(page, 'ArrowLeft', 4)).toEqual([5, 4, 3, 2]);
  expect(await walk(page, 'Shift+ArrowRight', 4)).toEqual([3, 4, 5, 6]);
});

test('moves the caret one character a press at the end of a line an answer is written below', async ({ page }) => {
  await openEditor(page, 'ai', 'ai=1');
  await hostOf(page, 'p').click();
  await caretSettled(page, hostOf(page, 'p'));
  await page.keyboard.press('ControlOrMeta+ArrowRight');
  await page.keyboard.type(' /continue');
  await page.keyboard.press('Enter');
  await ai.push(page, 'Ghost words here');
  await expect(ghost(page)).toHaveText('Ghost words here');
  await hostOf(page, 'p').click();
  await caretSettled(page, hostOf(page, 'p'));
  const end = (await markdown(page, 'p')).replace('&#32;', ' ').length;
  await page.evaluate((offset) => window.__quoin.controller!.focus({ block: 'p', region: 'text', offset }), end);
  expect(await walk(page, 'ArrowLeft', 2)).toEqual([end - 1, end - 2]);
  expect(await walk(page, 'ArrowRight', 2)).toEqual([end - 1, end]);
  const box = await ghost(page).boundingBox();
  const text = await hostOf(page, 'p').boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(text!.y + text!.height - 1);
  const next = await hostOf(page, 'q').boundingBox();
  expect(next!.y).toBeGreaterThanOrEqual(box!.y + box!.height);
});

test('keeps a link in the answer out of the tab order, and axe finds nothing', async ({ page }) => {
  await askAboutFirstWord(page, 'improve');
  await ai.push(page, 'See [docs](https://quoin.test) now');
  await expect(ghost(page).locator('a')).toHaveCount(1);
  expect(await ghost(page).locator('a').evaluate((link) => (link as HTMLElement).closest('[inert]') !== null)).toBe(true);
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
});

test('types a plain space on a line cleared in one step, or typed in, emptied, left and returned to', async ({
  page,
}) => {
  await openEditor(page, 'ai', 'ai=1');
  await hostOf(page, 'r').click();
  await caretSettled(page, hostOf(page, 'r'));
  await page.keyboard.press('ControlOrMeta+a');
  await expect.poll(() => page.evaluate(() => window.__quoin.controller!.editor.state.selection?.kind)).toBe('text');
  await page.keyboard.press('Backspace');
  await expect.poll(() => markdown(page, 'r')).toBe('');
  await page.keyboard.press('Space');
  await expect.poll(() => markdown(page, 'r')).toBe('&#32;');
  await expect(field(page)).toHaveCount(0);

  await hostOf(page, 'q').click();
  await caretSettled(page, hostOf(page, 'q'));
  await page.keyboard.type('ab');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect.poll(() => markdown(page, 'q')).toBe('&#32;');
  await expect(field(page)).toHaveCount(0);
});

for (const retried of [false, true]) {
  test(`puts the answer between the neighbours of a block deleted while it streamed${retried ? ', after a Retry' : ''}`, async ({
    page,
  }) => {
    await openEditor(page, 'ai', 'ai=1');
    await hostOf(page, 'q').click();
    await caretSettled(page, hostOf(page, 'q'));
    await page.keyboard.type('Middle words /ai');
    await page.keyboard.press('Enter');
    await page.keyboard.type('improve');
    await page.keyboard.press('Enter');
    await ai.push(page, 'Better words');
    await expect(ghost(page)).toHaveText('Better words');
    await page.evaluate(() => window.__quoin.removeRemotely?.('q'));
    await expect(bar(page)).toContainText('Stopped');
    if (retried) {
      await bar(page).getByRole('button', { name: 'Retry' }).click();
      await ai.push(page, 'Retried words');
      await ai.end(page);
    }
    await expect(bar(page)).toContainText('removed');
    await bar(page).getByRole('button', { name: 'Accept' }).click();
    await expect
      .poll(async () => (await blocks(page)).map((block) => block.data.markdown))
      .toEqual(['Make this sentence better.', retried ? 'Retried words' : 'Better words', 'Another paragraph after.']);
  });
}
