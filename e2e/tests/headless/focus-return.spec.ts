import { expect, test } from '@playwright/test';
import { caretAt, domCaret, host, modelMarkdown, modelSelection, openHeadless } from '../../support/headless';

const three = ['Alpha beta gamma', 'Delta epsilon', 'Zeta eta theta'];

test.describe('focus that comes back by keyboard', () => {
  test('Tab back from a toolbar button finds the selection the button formatted', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 3);
    for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowRight');
    const selected = { kind: 'text', anchor: { block: 'b', offset: 3 }, head: { block: 'b', offset: 8 } };
    await expect.poll(() => modelSelection(page)).toMatchObject(selected);
    const bold = page.getByRole('button', { name: 'Bold' });
    await bold.click();
    // Safari does not focus a button it clicks.
    await bold.focus();
    await expect.poll(() => modelMarkdown(page)).toEqual(['Alpha beta gamma', 'Del**ta ep**silon', 'Zeta eta theta']);
    await page.keyboard.press('Tab');
    await expect(host(page, 1)).toBeFocused();
    await page.keyboard.press('ControlOrMeta+b');
    await expect.poll(() => modelMarkdown(page)).toEqual(three);
    expect(await modelSelection(page)).toMatchObject(selected);
  });

  test('Shift+Tab back lands on the selection the model took while focus was away', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 0, 2);
    await page.getByRole('button', { name: 'After the editor' }).focus();
    await page.evaluate(() => {
      const { controller } = window.__quoin;
      const caret = { block: 'c', region: 'text', offset: 1 };
      controller!.dispatch(controller!.editor.createTransaction().setSelection({ kind: 'text', anchor: caret, head: caret }));
    });
    await page.keyboard.press('Shift+Tab');
    await expect(host(page, 2)).toBeFocused();
    await expect.poll(() => domCaret(page)).toEqual({ block: 'c', offset: 1 });
    await page.keyboard.type('W');
    await expect.poll(() => modelMarkdown(page)).toEqual(['Alpha beta gamma', 'Delta epsilon', 'ZWeta eta theta']);
  });
});
