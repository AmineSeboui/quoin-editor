import { expect, test } from '@playwright/test';
import { caretAt, domCaret, markdown, modelSelection, openHeadless } from '../../support/headless';

test.describe('macOS text bindings', () => {
  test.skip(
    ({ browserName }) => process.platform !== 'darwin' || browserName === 'firefox',
    'Ctrl+T, Ctrl+K and Ctrl+D are macOS text bindings that Playwright applies in Chromium and WebKit on a Mac only',
  );

  test('Ctrl+T swaps the characters around the caret and leaves the caret after them', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 6);
    await page.keyboard.press('Control+t');
    expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Deltae psilon', 'Zeta eta theta']);
    expect(await modelSelection(page)).toMatchObject({ head: { block: 'b', offset: 7 } });
    expect(await domCaret(page)).toEqual({ block: 'b', offset: 7 });
    await page.keyboard.type('x');
    expect((await markdown(page))[1]).toBe('Deltae xpsilon');
  });

  test('Ctrl+T at the end of a line swaps the two characters before the caret', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 13);
    await page.keyboard.press('Control+t');
    expect((await markdown(page))[1]).toBe('Delta epsilno');
  });

  test('Ctrl+K deletes to the end of the line and one undo brings it back', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 6);
    await page.keyboard.press('Control+k');
    expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Delta&#32;', 'Zeta eta theta']);
    expect(await domCaret(page)).toEqual({ block: 'b', offset: 6 });
    await page.keyboard.press('Meta+z');
    expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Delta epsilon', 'Zeta eta theta']);
  });

  test('Ctrl+D deletes the character after the caret', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 6);
    await page.keyboard.press('Control+d');
    expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Delta psilon', 'Zeta eta theta']);
    expect(await domCaret(page)).toEqual({ block: 'b', offset: 6 });
  });

  test('Ctrl+T changes the document once', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 6);
    const before = await page.evaluate(() => window.__quoin.changes);
    await page.keyboard.press('Control+t');
    expect(await page.evaluate(() => window.__quoin.changes)).toBe(before + 1);
  });
});
