import { expect, test, type Page } from '@playwright/test';
import { caretAt, domCaret, host, markdown, modelSelection, openHeadless } from '../../support/headless';

// A synthetic beforeinput has no target ranges, so the editor acts on its own selection, as it does for the real event.
function inject(page: Page, inputType: string) {
  return host(page, 1).evaluate((element, type) => {
    element.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: type,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, inputType);
}

test.describe('text key edits by beforeinput', () => {
  test('transpose swaps the characters around the caret and leaves the caret after them', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 6);
    await inject(page, 'insertTranspose');
    expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Deltae psilon', 'Zeta eta theta']);
    expect(await modelSelection(page)).toMatchObject({
      head: { block: 'b', offset: 7 },
    });
    expect(await domCaret(page)).toEqual({ block: 'b', offset: 7 });
    await page.keyboard.type('x');
    expect((await markdown(page))[1]).toBe('Deltae xpsilon');
  });

  test('transpose at the end of a line swaps the two characters before the caret', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 13);
    await inject(page, 'insertTranspose');
    expect((await markdown(page))[1]).toBe('Delta epsilno');
  });

  test('transpose changes the document once', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 6);
    const before = await page.evaluate(() => window.__quoin.changes);
    await inject(page, 'insertTranspose');
    expect(await page.evaluate(() => window.__quoin.changes)).toBe(before + 1);
  });

  for (const inputType of ['deleteSoftLineForward', 'deleteHardLineForward']) {
    test(`${inputType} deletes to the end of the line and one undo brings it back`, async ({ page }) => {
      await openHeadless(page, 'three');
      await caretAt(page, 1, 6);
      await inject(page, inputType);
      expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Delta&#32;', 'Zeta eta theta']);
      expect(await domCaret(page)).toEqual({ block: 'b', offset: 6 });
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
      expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Delta epsilon', 'Zeta eta theta']);
    });
  }

  test('deleteContentForward deletes the character after the caret', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 6);
    await inject(page, 'deleteContentForward');
    expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Delta psilon', 'Zeta eta theta']);
    expect(await domCaret(page)).toEqual({ block: 'b', offset: 6 });
  });
});

test.describe('delete forward key', () => {
  // Transpose and delete to the end of the line have no key on Linux or Windows: Ctrl+T, Ctrl+K and Ctrl+D are macOS
  // text bindings, so those are covered above by the events they produce.
  test('Delete removes the character after the caret', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 6);
    await page.keyboard.press('Delete');
    expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Delta psilon', 'Zeta eta theta']);
    expect(await domCaret(page)).toEqual({ block: 'b', offset: 6 });
  });
});
