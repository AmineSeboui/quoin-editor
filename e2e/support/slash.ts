import { expect, type Page } from '@playwright/test';

/** Types a slash and the query where the caret is, checks the command it ranks first, and chooses it. */
export async function chooseCommand(page: Page, query: string, name: string) {
  await page.keyboard.type(`/${query}`);
  await expect(page.getByRole('listbox', { name: 'Commands' }).getByRole('option', { selected: true })).toContainText(name);
  await page.keyboard.press('Enter');
}
