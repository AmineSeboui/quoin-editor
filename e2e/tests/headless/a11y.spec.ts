import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { caretAt, host, modelSelection, openHeadless } from '../../support/headless';

const serious = (page: Page) => axeViolations(page, 'serious');

test('the headless editor has no serious accessibility violations in any state', async ({ page }) => {
  await openHeadless(page, 'sample');
  expect(await serious(page)).toEqual([]);
  await caretAt(page, 0, 1);
  await expect.poll(() => modelSelection(page)).toMatchObject({ kind: 'text', anchor: { block: 'h', offset: 1 } });
  expect(await serious(page)).toEqual([]);
  const a = (await host(page, 0).boundingBox())!;
  const b = (await host(page, 2).boundingBox())!;
  await page.mouse.move(a.x + 4, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 4, b.y + b.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(() => modelSelection(page))
    .toMatchObject({ kind: 'text', anchor: { block: 'h' }, head: { block: 'b' } });
  expect(await serious(page)).toEqual([]);
  await page.locator('[data-type="DIVIDER"]').click();
  await expect.poll(() => modelSelection(page)).toMatchObject({ kind: 'node', block: 'd' });
  expect(await serious(page)).toEqual([]);
});

test.describe('axe finds nothing in the states that change the DOM', () => {
  test('during a composition', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP IME input is Chromium only');
    await openHeadless(page, 'sample');
    await caretAt(page, 1, 0);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '\u306b', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.imeSetComposition', { text: '\u306b\u307b', selectionStart: 2, selectionEnd: 2 });
    await expect(host(page, 1)).toContainText('\u306b\u307b');
    expect(await axeViolations(page)).toEqual([]);
    await cdp.send('Input.insertText', { text: '\u65e5\u672c' });
    await expect.poll(async () => (await modelSelection(page))?.kind).toBe('text');
    expect(await axeViolations(page)).toEqual([]);
  });

  test('with a closed toggle that hides its children', async ({ page }) => {
    await openHeadless(page, 'closed');
    await expect(page.locator('[data-block-id="t"]')).toBeVisible();
    await expect(page.locator('[data-block-id="c"]')).toHaveCount(0);
    expect(await axeViolations(page)).toEqual([]);
    await page.locator('[data-block-id="t"]').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+a');
    await expect(page.getByRole('textbox', { name: 'Selected content' })).toBeFocused();
    expect(await axeViolations(page)).toEqual([]);
  });

  test('read-only, at rest and with a selection across blocks', async ({ page }) => {
    await openHeadless(page, 'sample', 'readonly=1');
    await expect(host(page, 1)).toHaveAttribute('aria-readonly', 'true');
    await expect(host(page, 1)).toHaveAttribute('contenteditable', 'false');
    expect(await axeViolations(page)).toEqual([]);
    const a = (await host(page, 0).boundingBox())!;
    const b = (await host(page, 2).boundingBox())!;
    await page.mouse.move(a.x + 4, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 4, b.y + b.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => modelSelection(page)).toMatchObject({ kind: 'text', anchor: { block: 'h' }, head: { block: 'b' } });
    const sink = page.getByRole('textbox', { name: 'Selected content' });
    await expect(sink).toBeFocused();
    await expect(sink).toHaveAttribute('aria-readonly', 'true');
    expect(await axeViolations(page)).toEqual([]);
  });

  test('the empty document, at rest and focused', async ({ page }) => {
    await openHeadless(page, 'empty');
    const empty = page.locator('[data-quoin-empty]');
    await expect(empty).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await empty.click();
    await expect(empty).toBeFocused();
    expect(await axeViolations(page)).toEqual([]);
  });
});
