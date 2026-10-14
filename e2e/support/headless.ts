import type { Page } from '@playwright/test';

export async function openHeadless(page: Page, doc = 'sample') {
  await page.goto(`/?view=headless&doc=${doc}`);
  await page.getByRole('group', { name: 'Document' }).waitFor();
}

export const host = (page: Page, index: number) => page.locator('[data-quoin-block]').nth(index).locator('[data-quoin-host]').first();

export function markdown(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__quoin.blocks().map((b) => (b.type === 'MARKDOWN' ? String(b.data.markdown) : `<${b.type}>`)));
}

export function modelSelection(page: Page) {
  return page.evaluate(() => window.__quoin.controller!.editor.state.selection);
}

export async function caretAt(page: Page, block: number, offset: number) {
  await page.evaluate(
    ([b, o]) => {
      const { controller } = window.__quoin;
      const { doc, schema } = controller!.editor.state;
      const id = doc.blocks[b].id;
      controller!.focus({ block: id, region: schema.blocks.get(doc.blocks[b].type)?.primaryRegion ?? 'text', offset: o });
    },
    [block, offset] as const,
  );
}

// The DOM selection's focus as a block and a text offset, measured on the host's text, for hosts without atoms.
export function domCaret(page: Page) {
  return page.evaluate(() => {
    const selection = document.getSelection();
    const node = selection?.focusNode;
    const element = node instanceof Element ? node : node?.parentElement;
    const host = element?.closest('[data-quoin-host]');
    if (!selection || !node || !host) return null;
    const range = document.createRange();
    range.setStart(host, 0);
    range.setEnd(node, selection.focusOffset);
    return { block: host.closest('[data-block-id]')?.getAttribute('data-block-id'), offset: range.toString().length };
  });
}

export function modelMarkdown(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__quoin.controller!.editor.getBlocks().map((b) => String(b.data.markdown)));
}
