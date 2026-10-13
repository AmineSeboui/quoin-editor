import { expect, test } from '@playwright/test';
import { caretAt, markdown, openHeadless } from '../../support/headless';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
const lineStart = process.platform === 'darwin' ? 'Meta+ArrowLeft' : 'Home';

test.describe('typing', () => {
  test('types, splits with Enter and merges with Backspace', async ({ page }) => {
    await openHeadless(page, 'empty');
    await page.getByRole('group', { name: 'Document' }).click();
    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await page.keyboard.type('world');
    expect(await markdown(page)).toEqual(['Hello', 'world']);
    await page.keyboard.press(lineStart);
    await page.keyboard.press('Backspace');
    expect(await markdown(page)).toEqual(['Helloworld']);
  });

  test('markdown shortcuts convert as you type and Backspace undoes them', async ({ page }) => {
    await openHeadless(page, 'empty');
    await page.getByRole('group', { name: 'Document' }).click();
    await page.keyboard.type('## Title');
    await page.keyboard.press('Enter');
    await page.keyboard.type('- item **bold** done');
    expect(await markdown(page)).toEqual(['## Title', '- item **bold** done']);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('#');
    await page.keyboard.press('Space');
    await page.keyboard.press('Backspace');
    expect((await markdown(page)).at(-1)).toBe('\\#&#32;');
  });

  test('Shift+Enter inserts a hard break and formatting shortcuts toggle marks', async ({ page }) => {
    await openHeadless(page, 'empty');
    await page.getByRole('group', { name: 'Document' }).click();
    await page.keyboard.type('a');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.press(`${mod}+b`);
    await page.keyboard.type('b');
    expect(await markdown(page)).toEqual(['a\\\n**b**']);
    await page.keyboard.press(`${mod}+z`);
    expect(await markdown(page)).toEqual(['a<br>']);
  });

  test('insertText without key events still reaches the model', async ({ page }) => {
    await openHeadless(page);
    await caretAt(page, 1, 0);
    await page.keyboard.insertText('Pasted-ish ');
    expect((await markdown(page))[1].startsWith('Pasted-ish ')).toBe(true);
  });

  test('word deletion removes the previous word', async ({ page }) => {
    await openHeadless(page, 'empty');
    await page.getByRole('group', { name: 'Document' }).click();
    await page.keyboard.type('one two three');
    await page.keyboard.press(process.platform === 'darwin' ? 'Alt+Backspace' : 'Control+Backspace');
    expect(await markdown(page)).toEqual(['one two&#32;']);
  });
});
