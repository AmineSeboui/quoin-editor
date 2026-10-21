import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { CATALOGUE_BLOCKS, type CatalogueBlock } from '../../support/catalogue-blocks';
import { blocks, caretSettled, openEditor } from '../../support/editor';
import { answerEveryRequest } from '../../support/network';
import { chooseCommand } from '../../support/slash';

type Requirement = 'insert' | 'edit' | 'arrows' | 'undo' | 'readOnly' | 'axeWhole' | 'axeEditing';

// The blocks no other spec covers for a requirement, so each runs here only where it would otherwise go untested.
const GAPS: Record<Requirement, readonly string[]> = {
  insert: ['text', 'heading1', 'heading2', 'heading3', 'numberedList', 'todoList', 'toggle'],
  edit: ['heading1', 'heading2', 'heading3', 'numberedList', 'todoList', 'toggle'],
  arrows: [
    'text',
    'heading1',
    'heading2',
    'heading3',
    'quote',
    'callout',
    'bulletedList',
    'numberedList',
    'todoList',
    'toggle',
    'file',
    'table',
    'embed',
    'bookmark',
    'blockEquation',
    'tableOfContents',
  ],
  undo: CATALOGUE_BLOCKS.map(({ id }) => id).filter((id) => id !== 'blockEquation'),
  readOnly: ['heading2', 'heading3', 'quote', 'bulletedList', 'numberedList', 'image'],
  axeWhole: CATALOGUE_BLOCKS.map(({ id }) => id).filter((id) => id !== 'image' && id !== 'file'),
  axeEditing: [
    'text',
    'heading1',
    'heading2',
    'heading3',
    'quote',
    'callout',
    'bulletedList',
    'numberedList',
    'todoList',
    'toggle',
  ],
};

const gaps = (requirement: Requirement) => CATALOGUE_BLOCKS.filter(({ id }) => GAPS[requirement].includes(id));

const shell = (page: Page, id: string) => page.locator(`[data-block-id="${id}"]`);
const host = (page: Page, id: string) => shell(page, id).locator('[data-quoin-host]').first();
const openEvery = (page: Page, extra = '') => openEditor(page, 'every', `catalogue=1${extra}`);

const selectedBlock = (page: Page) =>
  page.evaluate(() => {
    const selection = window.__quoin.controller!.editor.state.selection;
    if (selection === null) return null;
    return selection.kind === 'node' ? selection.block : selection.kind === 'blocks' ? selection.head : selection.head.block;
  });

const lineBeside = (page: Page, id: string, side: 'previous' | 'next') =>
  shell(page, id).evaluate(
    (element, key) => element[key === 'previous' ? 'previousElementSibling' : 'nextElementSibling']!.getAttribute('data-block-id')!,
    side,
  );

async function caretAtEnd(page: Page, id: string) {
  await host(page, id).click();
  await caretSettled(page, host(page, id));
  await page.keyboard.press('End');
}

async function press(page: Page, key: string, times: number) {
  for (let i = 0; i < times; i++) await page.keyboard.press(key);
}

async function insert(page: Page, { option, query, link, inserted }: CatalogueBlock, extra = '') {
  await openEditor(page, 'empty', `catalogue=1${extra}`);
  const line = page.locator('[data-quoin-host]').first();
  await line.click();
  await caretSettled(page, line);
  await chooseCommand(page, query, option);
  if (link !== undefined) {
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.type(link);
    await page.keyboard.press('Enter');
  }
  await expect.poll(async () => (await blocks(page)).map(({ type, data }) => ({ type, data }))[0]).toEqual(inserted);
}

test.beforeEach(({ page }) => answerEveryRequest(page));

for (const block of gaps('insert')) {
  test(`${block.option} from the slash menu takes the place of the query, with the caret in it`, async ({ page }) => {
    await insert(page, block);
    expect(await blocks(page)).toHaveLength(1);
    expect(await selectedBlock(page)).toBe((await blocks(page))[0].id);
    await expect(page.getByRole('listbox', { name: 'Commands' })).toHaveCount(0);
  });
}

for (const block of gaps('edit')) {
  test(`${block.option} takes the text typed at its end`, async ({ page }) => {
    await openEvery(page);
    await caretAtEnd(page, block.id);
    await page.keyboard.type(' more');
    await expect.poll(async () => (await blocks(page)).find(({ id }) => id === block.id)?.data).toEqual(block.edited);
  });
}

for (const { id, option, rows = 1 } of gaps('arrows')) {
  test(`the arrows go into ${option} from the line above, on to the line below, and back`, async ({ page }) => {
    await openEvery(page);
    const [above, below] = [await lineBeside(page, id, 'previous'), await lineBeside(page, id, 'next')];
    await caretAtEnd(page, above);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => selectedBlock(page)).toBe(id);
    await press(page, 'ArrowDown', rows);
    await expect.poll(() => selectedBlock(page)).toBe(below);
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => selectedBlock(page)).toBe(id);
    await press(page, 'ArrowUp', rows);
    await expect.poll(() => selectedBlock(page)).toBe(above);
    await expect(host(page, above)).toBeFocused();
  });
}

// With an upload function, as hosts give one, an inserted image or file takes focus onto its upload button.
for (const block of gaps('undo')) {
  test(`undo takes ${block.option} back out, to the line as it was before the command`, async ({ page }) => {
    await insert(page, block, '&upload=0');
    await page.keyboard.press('ControlOrMeta+z');
    await expect
      .poll(async () => (await blocks(page)).map(({ type, data }) => ({ type, data })))
      .toEqual([{ type: 'MARKDOWN', data: { markdown: block.undone ?? `/${block.query}` } }]);
  });
}

for (const { id, option, drawn } of gaps('readOnly')) {
  test(`a read-only canvas draws ${option} with nothing to edit`, async ({ page }) => {
    await openEvery(page, '&readonly=1');
    await expect(drawn!(shell(page, id))).toBeVisible();
    await expect(shell(page, id).locator('[contenteditable="true"]')).toHaveCount(0);
  });
}

for (const { id, option, wholeByArrow } of gaps('axeWhole')) {
  test.describe(() => {
    test.fixme(
      ({ browserName }) => browserName === 'webkit' && id === 'text',
      'WebKit cannot close the page once a paragraph of a long document has been selected as a whole for a second',
    );
    test(`axe finds no violation with ${option} selected as a whole`, async ({ page }) => {
      await openEvery(page);
      await caretAtEnd(page, await lineBeside(page, id, 'previous'));
      await page.keyboard.press('ArrowDown');
      if (!wholeByArrow) {
        await expect.poll(() => selectedBlock(page)).toBe(id);
        await page.keyboard.press('Escape');
      }
      await expect(shell(page, id)).toHaveAttribute('data-selected', 'true');
      await page.mouse.move(0, 0);
      expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
    });
  });
}

for (const { id, option } of gaps('axeEditing')) {
  test(`axe finds no violation with the caret in ${option}`, async ({ page }) => {
    await openEvery(page);
    await caretAtEnd(page, id);
    await page.mouse.move(0, 0);
    expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  });
}
