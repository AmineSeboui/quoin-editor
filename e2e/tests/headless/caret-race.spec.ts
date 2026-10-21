import { expect, test, type Page } from '@playwright/test';
import { caretAt, domCaret, modelMarkdown, modelSelection, openHeadless } from '../../support/headless';

// Moves the caret back one character the way an arrow key does, then commits a change the page makes to a block in the
// same task, before the selection change the move queued can be read.
function moveThenRewrite(page: Page, id: string, prefix: string) {
  return page.evaluate(
    ([id, prefix]) => {
      document.getSelection()!.modify('move', 'backward', 'character');
      const { editor } = window.__quoin.controller!;
      editor.setBlocks(
        editor.getBlocks().map((b) => (b.id === id ? { ...b, data: { markdown: `${prefix}${String(b.data.markdown)}` } } : b)),
      );
    },
    [id, prefix] as const,
  );
}

async function head(page: Page) {
  const selection = (await modelSelection(page)) as { head: { block: string; offset: number } };
  return { block: selection.head.block, offset: selection.head.offset };
}

test.describe('a change from outside committed between a native caret move and its selection change', () => {
  test('keeps the caret where the move put it when another block changes', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 8);
    await moveThenRewrite(page, 'c', 'New ');
    await expect.poll(() => modelMarkdown(page)).toEqual(['Alpha beta gamma', 'Delta epsilon', 'New Zeta eta theta']);
    await expect.poll(() => domCaret(page)).toEqual({ block: 'b', offset: 7 });
    expect(await head(page)).toEqual({ block: 'b', offset: 7 });
    await page.keyboard.type('Q');
    await expect.poll(() => modelMarkdown(page)).toEqual(['Alpha beta gamma', 'Delta eQpsilon', 'New Zeta eta theta']);
  });

  test('carries the caret the move put down past text put before it', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 8);
    await moveThenRewrite(page, 'b', 'XX');
    await expect.poll(() => modelMarkdown(page)).toEqual(['Alpha beta gamma', 'XXDelta epsilon', 'Zeta eta theta']);
    await expect.poll(() => domCaret(page)).toEqual({ block: 'b', offset: 9 });
    expect(await head(page)).toEqual({ block: 'b', offset: 9 });
    await page.keyboard.type('Q');
    await expect.poll(() => modelMarkdown(page)).toEqual(['Alpha beta gamma', 'XXDelta eQpsilon', 'Zeta eta theta']);
  });
});
