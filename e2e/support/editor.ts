import { expect, type Locator, type Page } from '@playwright/test';
import type { QuoinBlock } from '../../src/types';

// extra is more query parameters the harness reads, such as 'readonly=1'.
export async function openEditor(page: Page, doc = 'empty', extra = '') {
  await page.goto(`/?doc=${doc}${extra === '' ? '' : `&${extra}`}`);
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
