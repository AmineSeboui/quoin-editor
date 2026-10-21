import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, caretSettled, openEditor } from '../../support/editor';

const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const markdown = async (page: Page) => (await blocks(page)).map((block) => String(block.data.markdown));
const caretOf = (page: Page, block: string) => page.locator(`[data-block-id="${block}"] .quoin-presence-caret`);

// Two pages of one browser context, of different widths, sharing a document through the harness's BroadcastChannel
// provider: Ada's page seeds it and Bea's takes it.
async function twoPages(page: Page, doc = 'sample') {
  await openEditor(page, doc, 'collab=presence&user=Ada%20Lovelace&color=%23b91c1c');
  const other = await page.context().newPage();
  await other.setViewportSize({ width: 640, height: 720 });
  await openEditor(other, 'empty', 'collab=presence&user=Bea&color=%231d4ed8&seed=0');
  await expect.poll(() => markdown(other)).toEqual(await markdown(page));
  return other;
}

// The model places the caret: Home and End do not move it in WebKit on macOS.
async function caretAt(page: Page, block: string, offset: number) {
  await page.evaluate((at) => window.__quoin.controller!.focus({ ...at, region: 'text' }), { block, offset });
  await caretSettled(page, host(page, block));
}

const caretAtEnd = async (page: Page, id: string) =>
  caretAt(
    page,
    id,
    String((await blocks(page)).find((block) => block.id === id)?.data.markdown).replace(/^# /, '').length,
  );

test.describe('presence between two pages', () => {
  test('shows what one page types in the other, with its caret, its name and its avatar', async ({ page }) => {
    const bea = await twoPages(page);
    await caretAtEnd(bea, 'a');
    const scroll = await bea.evaluate(() => scrollY);
    await caretAtEnd(page, 'b');
    await page.keyboard.type(' Hello');
    await expect.poll(() => markdown(bea)).toEqual(['# Title', 'First paragraph. Hello']);
    await expect(caretOf(bea, 'b')).toBeVisible();
    await expect(caretOf(bea, 'b')).toHaveText('Ada Lovelace');
    await expect(bea.getByRole('img', { name: 'Ada Lovelace is here' })).toBeVisible();
    await expect(caretOf(page, 'a')).toHaveText('Bea');
    await expect(host(bea, 'a')).toBeFocused();
    expect(await bea.evaluate(() => scrollY)).toBe(scroll);
  });

  test('fades a still collaborator name, keeps its caret and drops both when it leaves', async ({ page }) => {
    const bea = await twoPages(page);
    await caretAtEnd(page, 'b');
    await expect(caretOf(bea, 'b')).toBeVisible();
    await expect(caretOf(bea, 'b')).toHaveAttribute('data-idle', '', { timeout: 4000 });
    await page.evaluate(() => window.__quoinLeave!());
    await page.close();
    await expect(caretOf(bea, 'b')).toHaveCount(0);
    await expect(bea.getByRole('status')).toHaveText('Ada Lovelace left', { timeout: 8000 });
  });

  test('keeps the caret of a page that types while the other types before it', async ({ page }) => {
    const bea = await twoPages(page);
    await caretAtEnd(page, 'b');
    await caretAt(bea, 'b', 0);
    const typed = 'abcdefghijklmnopqrst';
    await Promise.all([page.keyboard.type(typed, { delay: 35 }), bea.keyboard.type('XYZXYZXYZ', { delay: 55 })]);
    const expected = ['# Title', `XYZXYZXYZFirst paragraph.${typed}`];
    await expect.poll(() => markdown(page)).toEqual(expected);
    await expect.poll(() => markdown(bea)).toEqual(expected);
  });

  test('a composition keeps what the other page types meanwhile', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP IME input is Chromium only');
    const bea = await twoPages(page);
    await caretAtEnd(bea, 'b');
    await caretAt(page, 'b', 0);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '\u304b', selectionStart: 1, selectionEnd: 1 });
    await bea.keyboard.type(' REMOTE');
    await expect.poll(async () => (await markdown(page))[1]).toMatch(/ REMOTE$/);
    await cdp.send('Input.imeSetComposition', { text: '\u304b\u3093', selectionStart: 2, selectionEnd: 2 });
    await cdp.send('Input.insertText', { text: '\u6f22\u5b57' });
    const expected = ['# Title', '\u6f22\u5b57First paragraph. REMOTE'];
    await expect.poll(() => markdown(page)).toEqual(expected);
    await expect.poll(() => markdown(bea)).toEqual(expected);
  });

  test('passes an accessibility scan with a collaborator caret, selection and avatar shown', async ({ page }) => {
    const bea = await twoPages(page);
    await caretAtEnd(page, 'b');
    for (let i = 0; i < 'paragraph.'.length; i++) await page.keyboard.press('Shift+ArrowLeft');
    await expect(bea.locator('[data-block-id="b"] .quoin-presence-selection')).toHaveText('paragraph.');
    await expect(bea.getByRole('img', { name: 'Ada Lovelace is here' })).toBeVisible();
    expect(await axeViolations(bea, 'all', '.quoin')).toEqual([]);
  });
});
