import { expect, test, type Locator, type Page } from '@playwright/test';
import type { QuoinBlock } from '../../src/types';

// A project named for the direction turns the harness round, so a spec written once runs both ways and the suite does
// not have to be kept twice. The language is left alone, since these specs find almost everything by its English name.
const rightToLeft = () => /(^|-)rtl$/.test(test.info().project.name);

// extra is more query parameters the harness reads, such as 'readonly=1'.
export async function openEditor(page: Page, doc = 'empty', extra = '') {
  const tail = [rightToLeft() ? 'dir=rtl' : '', extra].filter(Boolean).join('&');
  await page.goto(`/?doc=${doc}${tail === '' ? '' : `&${tail}`}`);
  await page.getByRole('group', { name: 'Document' }).waitFor();
}

export function blocks(page: Page): Promise<QuoinBlock[]> {
  return page.evaluate(() => window.__quoin.blocks());
}

// The click places the caret through the browser, so its selectionchange has to reach the editor before a key does.
export async function caretSettled(page: Page, host: Locator) {
  await expect(host).toBeFocused();
  await page.waitForFunction(() => document.activeElement?.contains(document.getSelection()?.focusNode ?? null));
}
