import { host } from '../../support/block';
import { expect, test, type Page } from '@playwright/test';
import { openEditor } from '../../support/editor';
import { allMarkdown } from '../../support/markdown';
import { textPoint } from '../../support/text-point';

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Text formatting' });

async function composeOverSelection(page: Page, steps: readonly string[], committed: string) {
  await expect(toolbar(page)).toBeVisible();
  const cdp = await page.context().newCDPSession(page);
  for (const text of steps) {
    await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
  }
  await cdp.send('Input.insertText', { text: committed });
}

test.describe('a composition over selected text', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP IME input is Chromium only');

  test('replaces the whole line with the composed text and the editor stays', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openEditor(page, 'sample');
    await host(page, 'b').click();
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await composeOverSelection(page, ['\u306b', '\u306b\u307b\u3093'], '\u65e5\u672c');
    await expect.poll(() => allMarkdown(page)).toEqual(['# Title', '\u65e5\u672c']);
    await expect(page.getByRole('group', { name: 'Document' })).toBeVisible();
    await expect(toolbar(page)).toBeHidden();
    await page.keyboard.type('!');
    await expect.poll(() => allMarkdown(page)).toEqual(['# Title', '\u65e5\u672c!']);
    expect(errors).toEqual([]);
  });

  test('replaces a selected word with the letter a dead key makes', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openEditor(page, 'sample');
    await host(page, 'b').dblclick({ position: await textPoint(host(page, 'b'), 'paragraph') });
    await composeOverSelection(page, ['\u00b4'], '\u00e9');
    await expect.poll(() => allMarkdown(page)).toEqual(['# Title', 'First \u00e9.']);
    await expect(host(page, 'b')).toBeFocused();
    await page.keyboard.type('t');
    await expect.poll(() => allMarkdown(page)).toEqual(['# Title', 'First \u00e9t.']);
    expect(errors).toEqual([]);
  });
});
