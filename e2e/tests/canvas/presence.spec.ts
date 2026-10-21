import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, caretSettled, openEditor } from '../../support/editor';

const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const markdown = async (page: Page) => (await blocks(page)).map((block) => String(block.data.markdown));
// Whether a collaborator's caret is drawn within a pixel or two of the start of the character at `at` of a host.
const onCharacter = async (page: Page, name: string, block: string, at: number) => {
  const { caret, point } = await boxes(page, name, block, at);
  return Math.abs(caret.x - point.x) < 3 && caret.top <= point.y && point.y <= caret.bottom;
};
const caretOf = (page: Page, name: string) => page.locator('.quoin-presence-caret').filter({ hasText: name });
const offset = (page: Page) =>
  page.evaluate(() => {
    const selection = window.__quoin.controller!.editor.state.selection;
    return selection?.kind === 'text' ? selection.head.offset : null;
  });

// The box of a collaborator caret and of the character of the host at `at`, in the page.
const boxes = (page: Page, name: string, block: string, at: number) =>
  page.evaluate(
    ([name, block, at]) => {
      const caret = [...document.querySelectorAll('.quoin-presence-caret')].find((one) => one.textContent === name)!;
      const host = document.querySelector(`[data-block-id="${block}"] [data-quoin-host]`)!;
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      let left = at;
      let node = walker.nextNode() as Text | null;
      while (node && left > node.length) {
        left -= node.length;
        node = walker.nextNode() as Text | null;
      }
      const range = document.createRange();
      range.setStart(node!, left);
      range.collapse(true);
      const point = range.getClientRects()[0] ?? range.getBoundingClientRect();
      const line = caret.getBoundingClientRect();
      return {
        caret: { x: line.left + line.width / 2, top: line.top, bottom: line.bottom },
        point: { x: point.left, y: point.top + point.height / 2 },
      };
    },
    [name, block, at] as const,
  );

// Two pages of one browser context, of different widths, sharing a document through the harness's BroadcastChannel
// provider: Ada's page seeds it and Bea's takes it.
async function twoPages(page: Page, doc = 'sample', ada = '', both = '') {
  await openEditor(page, doc, `collab=presence&user=Ada%20Lovelace&color=%23b91c1c${ada}${both}`);
  const other = await page.context().newPage();
  await other.setViewportSize({ width: 640, height: 720 });
  await openEditor(other, 'empty', `collab=presence&user=Bea&color=%231d4ed8&seed=0${both}`);
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
    await expect(caretOf(bea, 'Ada Lovelace')).toBeVisible();
    await expect(bea.getByRole('img', { name: 'Ada Lovelace is here' })).toBeVisible();
    await expect(caretOf(page, 'Bea')).toBeVisible();
    await expect(bea.locator('[data-quoin-host] .quoin-presence-caret')).toHaveCount(0);
    await expect
      .poll(async () => {
        const { caret, point } = await boxes(bea, 'Ada Lovelace', 'b', 'First paragraph. Hello'.length);
        return Math.abs(caret.x - point.x) < 3 && caret.top <= point.y && point.y <= caret.bottom;
      })
      .toBe(true);
    await expect(host(bea, 'a')).toBeFocused();
    expect(await bea.evaluate(() => scrollY)).toBe(scroll);
  });

  test('fades a still collaborator name, keeps its caret and drops both when it leaves', async ({ page }) => {
    const bea = await twoPages(page);
    await caretAtEnd(page, 'b');
    await expect(caretOf(bea, 'Ada Lovelace')).toBeVisible();
    await expect(caretOf(bea, 'Ada Lovelace')).toHaveAttribute('data-idle', '', { timeout: 4000 });
    await page.evaluate(() => window.__quoinLeave!());
    await page.close();
    await expect(caretOf(bea, 'Ada Lovelace')).toHaveCount(0);
    await expect(bea.getByRole('status')).toHaveText('Ada Lovelace left', { timeout: 8000 });
  });

  for (const [setting, ada] of [
    ['', ''],
    [', its updates applied several in one task', '&batch=1'],
  ]) {
    test(`keeps the caret of a page that types while the other types before it${setting}`, async ({ page }) => {
      const bea = await twoPages(page, 'sample', ada);
      await caretAtEnd(page, 'b');
      await caretAt(bea, 'b', 0);
      const typed = 'abcdefghijklmnopqrst';
      await Promise.all([page.keyboard.type(typed, { delay: 35 }), bea.keyboard.type('XYZXYZXYZ', { delay: 55 })]);
      const expected = ['# Title', `XYZXYZXYZFirst paragraph.${typed}`];
      await expect.poll(() => markdown(page)).toEqual(expected);
      await expect.poll(() => markdown(bea)).toEqual(expected);
    });
  }

  test('moves the caret one character a press across a collaborator caret, both ways', async ({ page }) => {
    const bea = await twoPages(page);
    await caretAt(bea, 'b', 5);
    await caretAt(page, 'b', 3);
    await expect(caretOf(page, 'Bea')).toBeVisible();
    const moved = async (key: string) => {
      const offsets: (number | null)[] = [];
      let last = await offset(page);
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press(key);
        await expect.poll(() => offset(page)).not.toBe(last);
        last = await offset(page);
        offsets.push(last);
      }
      return offsets;
    };
    expect(await moved('ArrowRight')).toEqual([4, 5, 6, 7]);
    expect(await moved('ArrowLeft')).toEqual([6, 5, 4, 3]);
    await page.keyboard.type('Q');
    await expect.poll(() => markdown(bea)).toEqual(['# Title', 'FirQst paragraph.']);
  });

  test('keeps a caret in a far column of a wide table inside the table, and moves it with the table', async ({
    page,
  }) => {
    const bea = await twoPages(page, 'wide-table', '', '&table=1');
    const far = page.getByRole('textbox', { name: 'Row 2, column 15', exact: true });
    await far.click();
    await expect(far).toBeFocused();
    const caret = caretOf(bea, 'Ada Lovelace');
    await expect(caret).toBeAttached();
    await expect(caret).toBeHidden();
    expect(await bea.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640);
    await bea.locator('.quoin-table-scroll').evaluate((scroller) => (scroller.scrollLeft = scroller.scrollWidth));
    await expect(caret).toBeVisible();
    const cell = bea.getByRole('textbox', { name: 'Row 2, column 15', exact: true });
    await expect
      .poll(async () => {
        const [line, box] = [await caret.boundingBox(), await cell.boundingBox()];
        return line !== null && box !== null && line.x >= box.x - 2 && line.x <= box.x + box.width;
      })
      .toBe(true);
    expect(await bea.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640);
  });

  test('puts a caret on its character when the canvas is scaled, and again when its text reflows', async ({ page }) => {
    const bea = await twoPages(page);
    await caretAt(page, 'b', 5);
    await expect(caretOf(bea, 'Ada Lovelace')).toBeVisible();
    await bea.evaluate(() => {
      const canvas = document.querySelector<HTMLElement>('.quoin-editor')!.parentElement!;
      canvas.style.transformOrigin = '0 0';
      canvas.style.transform = 'scale(1.5)';
    });
    await expect.poll(() => onCharacter(bea, 'Ada Lovelace', 'b', 5)).toBe(true);
    await bea.evaluate(() => {
      document.querySelector<HTMLElement>('[data-block-id="b"] [data-quoin-host]')!.style.fontSize = '32px';
    });
    await expect.poll(() => onCharacter(bea, 'Ada Lovelace', 'b', 5)).toBe(true);
  });

  test('keeps the avatars in a gutter of their own, clear of the text, on a narrow page', async ({ page }) => {
    const bea = await twoPages(page);
    await caretAtEnd(page, 'b');
    await page.keyboard.type(
      ' Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt',
    );
    const avatar = bea.getByRole('img', { name: 'Ada Lovelace is here' });
    await expect(avatar).toBeVisible();
    const overlaps = await bea.evaluate(() => {
      const group = document.querySelector('.quoin-presence-group')!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('[data-block-id="b"] [data-quoin-host]')!);
      return [...range.getClientRects()].filter(
        (rect) =>
          rect.width > 0 &&
          rect.right > group.left &&
          rect.left < group.right &&
          rect.bottom > group.top &&
          rect.top < group.bottom,
      ).length;
    });
    expect(overlaps).toBe(0);
    await bea.screenshot({ path: test.info().outputPath('avatars.png') });
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
