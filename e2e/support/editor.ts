import type { Page } from '@playwright/test';
import type { QuoinBlock } from '../../src/types';

export async function openEditor(page: Page, doc = 'empty') {
  await page.goto(`/?doc=${doc}`);
  await page.getByRole('group', { name: 'Document' }).waitFor();
}

export function blocks(page: Page): Promise<QuoinBlock[]> {
  return page.evaluate(() => window.__quoin.blocks());
}
