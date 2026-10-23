import { expect, test } from '@playwright/test';
import { stayLocal, waitForIslands } from './support';

test.beforeEach(({ page }) => stayLocal(page));

test('the home editor hands its edits back as markdown', async ({ page }) => {
  await page.goto('');
  await waitForIslands(page);
  await page.locator('.quoin-editor').getByText('Diff it in git').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' today');
  await expect(page.getByRole('region', { name: 'What onChange hands you, as markdown' }).locator('pre')).toContainText('- [ ] Diff it in git today');
});

test('the two collaboration editors follow each other', async ({ page }) => {
  await page.goto('collaboration/');
  await waitForIslands(page);
  const grace = page.getByRole('region', { name: 'Grace’s editor' });
  await expect(grace.getByText('A shared document')).toBeVisible();
  await grace.getByText('A shared document').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' by two');
  const ada = page.getByRole('region', { name: 'Ada’s editor' });
  await expect(ada.getByText('A shared document by two')).toBeVisible();
});

test('the AI page says it is a simulation and streams an answer in', async ({ page }) => {
  await page.goto('ai/');
  await expect(page.getByText('A simulation.')).toBeVisible();
  await waitForIslands(page);
  await page.getByText('Select this sentence').click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/continue');
  await page.keyboard.press('Enter');
  await expect(page.getByText('accepts it in one undo step').first()).toBeVisible();
});

test('the comments page shows its thread and takes a reply', async ({ page }) => {
  await page.goto('comments/');
  await waitForIslands(page);
  await page.locator('.quoin-editor [data-comment="first"]').click();
  await expect(page.getByText('Can we make it Friday?').first()).toBeVisible();
  await page.getByRole('textbox', { name: 'Reply' }).first().fill('Friday works');
  await page.getByRole('button', { name: 'Send' }).first().click();
  await expect(page.getByText('Friday works').first()).toBeVisible();
});

test('the server rendering page draws both documents with no editor', async ({ page }) => {
  await page.goto('server-rendering/');
  await expect(page.locator('.quoin-view').first()).toContainText('Paste keeps');
  await expect(page.locator('.quoin-diff ins').first()).toBeVisible();
  await expect(page.locator('.quoin-editor')).toHaveCount(0);
});
