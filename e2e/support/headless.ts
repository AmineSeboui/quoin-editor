import type { Page } from '@playwright/test';

// extra is more query parameters the harness reads, such as 'readonly=1' or 'echo=late'.
export async function openHeadless(page: Page, doc = 'sample', extra = '') {
  await page.goto(`/?view=headless&doc=${doc}${extra === '' ? '' : `&${extra}`}`);
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

// The DOM selection's focus as a block and an offset in the host's text, where a hard break counts one, for hosts
// without atoms.
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
    const breaks = range.cloneContents().querySelectorAll('br[data-quoin-break]').length;
    return { block: host.closest('[data-block-id]')?.getAttribute('data-block-id'), offset: range.toString().length + breaks };
  });
}

export function modelMarkdown(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__quoin.controller!.editor.getBlocks().map((b) => String(b.data.markdown)));
}

// Selects text from one block's offset to another's through the controller, so a spec starts from an exact range whatever
// the browser's metrics. The editor must be focused for focus to follow the selection.
export function selectText(page: Page, from: readonly [block: number, offset: number], to: readonly [block: number, offset: number]) {
  return page.evaluate(
    ([a, b]) => {
      const { controller } = window.__quoin;
      const { doc } = controller!.editor.state;
      const pos = ([block, offset]: readonly [number, number]) => ({ block: doc.blocks[block].id, region: 'text', offset });
      controller!.dispatch(controller!.editor.createTransaction().setSelection({ kind: 'text', anchor: pos(a), head: pos(b) }));
    },
    [from, to] as const,
  );
}

// What the browser itself has selected: Firefox and Safari fire copy and cut only for a native, non-collapsed selection.
export function nativeSelection(page: Page) {
  return page.evaluate(() => {
    const selection = document.getSelection()!;
    const sink = document.querySelector('[data-quoin-sink]');
    return {
      collapsed: selection.isCollapsed,
      inSink: sink !== null && sink.contains(selection.anchorNode) && sink.contains(selection.focusNode),
      text: selection.toString().replace(/\s+/g, ' ').trim(),
    };
  });
}

// The model selection once per animation frame, so a spec can show it stayed put while the page settled without waiting
// a fixed time.
export function selectionOverFrames(page: Page, frames: number) {
  return page.evaluate(async (count) => {
    const samples = [];
    for (let i = 0; i < count; i++) {
      samples.push(structuredClone(window.__quoin.controller!.editor.state.selection));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return samples;
  }, frames);
}
