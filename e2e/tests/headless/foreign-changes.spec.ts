import { expect, test, type Page } from '@playwright/test';
import type { QuoinBlock } from 'quoin-editor';
import { caretAt, domCaret, markdown, modelMarkdown, modelSelection } from '../../support/headless';

const ECHOES = ['immediate', 'late', 'clone', 'never'];

async function open(page: Page, echo: string) {
  await page.goto(`/?view=headless&doc=three&echo=${echo}`);
  await page.getByRole('group', { name: 'Document' }).waitFor();
}

// Resolves with the caret the engine maps the change to, before anything in the page can read the DOM back.
function rewrite(page: Page, id: string, before: string, after: string) {
  return page.evaluate(
    ([id, before, after]) =>
      new Promise<{ block: string; offset: number }>((resolve) => {
        const { editor } = window.__quoin.controller!;
        const stop = editor.subscribe((state, tr) => {
          if (tr?.origin !== 'reconcile' || state.selection?.kind !== 'text') return;
          stop();
          resolve({ block: state.selection.head.block, offset: state.selection.head.offset });
        });
        window.__quoin.setBlocks!((blocks) =>
          blocks.map((b) => (b.id === id ? { ...b, data: { markdown: `${before}${String(b.data.markdown)}${after}` } } : b)),
        );
      }),
    [id, before, after] as const,
  );
}

function load(page: Page, blocks: QuoinBlock[]) {
  return page.evaluate((next) => window.__quoin.setBlocks!(() => next), blocks);
}

async function head(page: Page) {
  const selection = (await modelSelection(page)) as { head: { block: string; offset: number } };
  return { block: selection.head.block, offset: selection.head.offset };
}

const focusedHostBlock = (page: Page) =>
  page.evaluate(() => document.activeElement?.closest('[data-block-id]')?.getAttribute('data-block-id') ?? document.activeElement?.tagName);

for (const echo of ECHOES) {
  test.describe(`changes the page makes to blocks it echoes ${echo}`, () => {
    test('text appended to the caret block leaves the caret where it was', async ({ page }) => {
      await open(page, echo);
      await caretAt(page, 1, 8);
      expect(await rewrite(page, 'b', '', ' and more')).toEqual({ block: 'b', offset: 8 });
      await expect.poll(() => modelMarkdown(page)).toEqual(['Alpha beta gamma', 'Delta epsilon and more', 'Zeta eta theta']);
      await expect.poll(() => domCaret(page)).toEqual({ block: 'b', offset: 8 });
      expect(await head(page)).toEqual({ block: 'b', offset: 8 });
      await page.keyboard.type('Q');
      await expect.poll(() => modelMarkdown(page)).toEqual(['Alpha beta gamma', 'Delta epQsilon and more', 'Zeta eta theta']);
    });

    test('text put before the caret leaves the DOM caret on the model caret', async ({ page }) => {
      await open(page, echo);
      await caretAt(page, 1, 8);
      const caret = await rewrite(page, 'b', 'XX', '');
      await expect.poll(() => modelMarkdown(page)).toEqual(['Alpha beta gamma', 'XXDelta epsilon', 'Zeta eta theta']);
      await expect.poll(() => domCaret(page)).toEqual(caret);
      expect(await head(page)).toEqual(caret);
      await page.keyboard.type('Q');
      const text = 'XXDelta epsilon';
      const typed = `${text.slice(0, caret.offset)}Q${text.slice(caret.offset)}`;
      await expect.poll(() => modelMarkdown(page)).toEqual(['Alpha beta gamma', typed, 'Zeta eta theta']);
    });

    test('a new kind for the caret block keeps focus and the caret in its host', async ({ page }) => {
      await open(page, echo);
      await caretAt(page, 1, 3);
      expect(await rewrite(page, 'b', '## ', '')).toEqual({ block: 'b', offset: 3 });
      await expect(page.getByRole('textbox', { name: 'Heading 2' })).toBeFocused();
      await expect.poll(() => domCaret(page)).toEqual({ block: 'b', offset: 3 });
      await page.keyboard.type('S');
      await expect.poll(() => modelMarkdown(page)).toEqual(['Alpha beta gamma', '## DelSta epsilon', 'Zeta eta theta']);
    });

    test('a document the page loads takes focus where its selection lands, or in its empty host', async ({ page }) => {
      await open(page, echo);
      await caretAt(page, 1, 3);
      await load(page, [
        { id: 'x1', type: 'MARKDOWN', data: { markdown: 'Other one' } },
        { id: 'x2', type: 'MARKDOWN', data: { markdown: 'Other two' } },
      ]);
      await expect.poll(() => modelMarkdown(page)).toEqual(['Other one', 'Other two']);
      const caret = await head(page);
      await expect.poll(() => focusedHostBlock(page)).toBe(caret.block);
      await expect.poll(() => domCaret(page)).toEqual(caret);
      await page.keyboard.type('U');
      const typed = ['x1', 'x2'].map((id, index) => {
        const text = ['Other one', 'Other two'][index];
        return id === caret.block ? `${text.slice(0, caret.offset)}U${text.slice(caret.offset)}` : text;
      });
      await expect.poll(() => modelMarkdown(page)).toEqual(typed);
      // A late echo landing after the next load would put this document back, as the page asked.
      if (echo !== 'never') await expect.poll(() => markdown(page)).toEqual(typed);
      await load(page, []);
      await expect.poll(() => modelMarkdown(page)).toEqual([]);
      await expect(page.getByRole('textbox', { name: 'Paragraph' })).toBeFocused();
      await page.keyboard.type('V');
      await expect.poll(() => modelMarkdown(page)).toEqual(['V']);
    });
  });
}
