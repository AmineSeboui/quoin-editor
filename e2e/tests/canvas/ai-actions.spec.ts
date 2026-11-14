import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { openEditor } from '../../support/editor';
import { inlineX } from '../../support/direction';
import { markdownOf } from '../../support/markdown';
import { firstWordPoint } from '../../support/text-point';

const hostOf = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Text formatting' });
const menu = (page: Page) => page.getByRole('listbox', { name: 'AI actions' });
const bar = (page: Page) => page.getByRole('group', { name: 'AI response' });
const requests = (page: Page) => page.evaluate(() => window.__quoinAi!.requests);
const RELEASE_NOTE = {
  action: 'custom',
  actionId: 'release-note',
  prompt: 'Rewrite this as one line of a release note, in en.',
  selection: 'Make',
};

async function selectFirstWord(page: Page) {
  await openEditor(page, 'ai', 'ai=actions');
  await hostOf(page, 'p').dblclick({ position: await firstWordPoint(hostOf(page, 'p')) });
  await expect(toolbar(page)).toBeVisible();
}

async function inlineStartOf(page: Page, name: string) {
  const box = (await menu(page).getByRole('option', { name, exact: true }).boundingBox())!;
  return inlineX(box, page.viewportSize()!.width);
}

test("lists the host's action after the built-in ones and sends what it asks to the stream", async ({ page }) => {
  await selectFirstWord(page);
  await toolbar(page).getByRole('button', { name: 'Ask AI' }).click();
  const group = menu(page).getByRole('group', { name: 'More actions' });
  await expect(group.getByRole('option')).toHaveText(['Rewrite as a release note']);
  const explain = (await menu(page).getByRole('option', { name: 'Explain' }).boundingBox())!;
  const release = (await group.getByRole('option').boundingBox())!;
  expect(release.y).toBeGreaterThan(explain.y + explain.height);
  expect(await inlineStartOf(page, 'Rewrite as a release note')).toBeCloseTo(await inlineStartOf(page, 'Explain'), 0);
  expect(await axeViolations(page, 'all', '[role="dialog"]')).toEqual([]);

  await page.keyboard.press('ArrowUp');
  const active = await page.getByRole('combobox').getAttribute('aria-activedescendant');
  await expect(group.getByRole('option')).toHaveAttribute('id', active!);
  await expect(group.getByRole('option')).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('Enter');
  await expect.poll(() => requests(page)).toEqual([expect.objectContaining(RELEASE_NOTE)]);

  await page.evaluate(() => window.__quoinAi!.push('Shipped: making'));
  await page.evaluate(() => window.__quoinAi!.end());
  await expect(bar(page).getByRole('button', { name: 'Accept' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => markdownOf(page, 'p')).toBe('Shipped: making this sentence better.');
});

test("offers the host's action as a button of the toolbar when it is placed there", async ({ page }) => {
  await selectFirstWord(page);
  await toolbar(page).getByRole('button', { name: 'Rewrite as a release note' }).click();
  await expect.poll(() => requests(page)).toEqual([expect.objectContaining(RELEASE_NOTE)]);
  await expect(bar(page)).toContainText('Writing');
});
