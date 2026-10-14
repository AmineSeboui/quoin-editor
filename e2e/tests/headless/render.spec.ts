import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { caretAt, host, markdown, modelSelection, openHeadless } from '../../support/headless';

const SAMPLE_KINDS = [
  { type: 'MARKDOWN', label: 'Heading 1', text: 'Headless sample' },
  { type: 'MARKDOWN', label: 'Paragraph', text: 'A paragraph with bold, italic and code.' },
  { type: 'MARKDOWN', label: 'Bullet list item', text: 'a bullet' },
  { type: 'MARKDOWN', label: 'Bullet list item', text: 'a nested bullet' },
  { type: 'MARKDOWN', label: 'Task', text: 'a task' },
  { type: 'MARKDOWN', label: 'Quote', text: 'a quote' },
  { type: 'DIVIDER' },
  { type: 'CALLOUT', label: 'Callout, info', text: 'A callout' },
];

test('renders every block kind as live formatted text', async ({ page }) => {
  await openHeadless(page);
  const blocks = page.locator('[data-quoin-block]');
  await expect(blocks).toHaveCount(SAMPLE_KINDS.length);
  for (const [index, kind] of SAMPLE_KINDS.entries()) {
    const block = blocks.nth(index);
    await expect(block).toBeVisible();
    await expect(block).toHaveAttribute('data-type', kind.type);
    if (kind.label === undefined) continue;
    const text = block.getByRole('textbox', { name: kind.label, exact: true });
    await expect(text).toBeVisible();
    await expect(text).toHaveText(kind.text);
  }
});

test('formats inline content inside the host and labels every kind', async ({ page }) => {
  await openHeadless(page);
  await expect(host(page, 1)).toHaveJSProperty('innerHTML', 'A paragraph with <strong>bold</strong>, <em>italic</em> and <code>code</code>.');
  await expect(page.getByRole('textbox', { name: 'Bullet list item' })).toHaveCount(2);
  for (const name of ['Task', 'Quote', 'Callout, info']) {
    await expect(page.getByRole('textbox', { name })).toBeVisible();
  }
  await expect(page.getByRole('checkbox', { name: 'Task' })).toHaveAttribute('aria-checked', 'false');
});

test('indents a nested block further than its parent', async ({ page }) => {
  await openHeadless(page);
  const [parent, child] = await Promise.all([host(page, 2).boundingBox(), host(page, 3).boundingBox()]);
  expect(child!.x).toBeGreaterThan(parent!.x + 8);
});

test('a click puts the model caret where the click fell', async ({ page }) => {
  await openHeadless(page);
  const paragraph = host(page, 1);
  const box = (await paragraph.boundingBox())!;
  await page.mouse.click(box.x + 2, box.y + box.height / 2);
  await expect.poll(() => modelSelection(page)).toMatchObject({ kind: 'text', head: { block: 'p', offset: 0 } });
});

test('a click after the last word puts the caret at the end of the model text', async ({ page }) => {
  await openHeadless(page);
  const paragraph = host(page, 1);
  const length = (await paragraph.textContent())!.length;
  const box = (await paragraph.boundingBox())!;
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await expect.poll(() => modelSelection(page)).toMatchObject({ kind: 'text', head: { block: 'p', offset: length } });
});

test('a click on a void block selects it as a node and outlines it', async ({ page }) => {
  await openHeadless(page);
  const divider = page.locator('[data-quoin-block][data-type="DIVIDER"]');
  await divider.click();
  await expect.poll(() => modelSelection(page)).toEqual({ kind: 'node', block: 'd' });
  await expect(divider).toHaveAttribute('data-selected', 'true');
  await expect(divider).not.toHaveAttribute('aria-selected');
  await expect(page.getByRole('status')).toHaveText('1 block selected');
});

test('the task checkbox toggles the block and reports the change', async ({ page }) => {
  await openHeadless(page);
  const box = page.getByRole('checkbox', { name: 'Task' });
  await box.click();
  await expect(box).toHaveAttribute('aria-checked', 'true');
  expect((await markdown(page))[4]).toBe('- [x] a task');
  expect(await page.evaluate(() => window.__quoin.changes)).toBe(1);
  await box.click();
  expect((await markdown(page))[4]).toBe('- [ ] a task');
});

test('typing the first character into an empty document creates a paragraph and focuses it', async ({ page }) => {
  await openHeadless(page, 'empty');
  const placeholder = page.getByRole('textbox', { name: 'Paragraph' });
  await expect(placeholder).toHaveAttribute('data-placeholder', 'Start writing');
  await placeholder.click();
  await page.keyboard.type('H');
  await expect.poll(() => markdown(page)).toEqual(['H']);
  await expect(host(page, 0)).toBeFocused();
  await expect(host(page, 0)).toHaveText('H');
  expect(await modelSelection(page)).toMatchObject({ kind: 'text', head: { offset: 1 } });
});

test('renders a thousand blocks', async ({ page }) => {
  await openHeadless(page, 'large');
  await expect(page.locator('[data-quoin-block]')).toHaveCount(1000);
  await expect(host(page, 999)).toContainText('Paragraph 999');
});

test('the sample document has no serious accessibility violations', async ({ page }) => {
  await openHeadless(page);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious).toEqual([]);
});

test('the sample document with every block selected has no serious accessibility violations', async ({ page }) => {
  await openHeadless(page);
  await caretAt(page, 1, 0);
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+a');
  await expect(page.locator('[data-quoin-block][data-selected="true"]')).toHaveCount(8);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious).toEqual([]);
});
