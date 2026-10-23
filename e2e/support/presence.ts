import type { Page } from '@playwright/test';

export const caretOf = (page: Page, name: string) => page.locator('.quoin-presence-caret').filter({ hasText: name });

/** The box of a collaborator caret and of the character of a block's host at `at`, in the page. */
const boxes = (page: Page, name: string, block: string, at: number) =>
  page.evaluate(
    ([name, block, at]) => {
      const caret = [...document.querySelectorAll('.quoin-presence-caret')].find((one) => one.textContent === name)!;
      const host = document.querySelector(`[data-block-id="${block}"] [data-quoin-host]`)!;
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      let left = at;
      let node = walker.nextNode() as Text | null;
      while (node && left > node.length) {
        left -= node.length;
        node = walker.nextNode() as Text | null;
      }
      const range = document.createRange();
      range.setStart(node!, left);
      range.collapse(true);
      const point = range.getClientRects()[0] ?? range.getBoundingClientRect();
      const line = caret.getBoundingClientRect();
      return {
        caret: { x: line.left + line.width / 2, top: line.top, bottom: line.bottom },
        point: { x: point.left, y: point.top + point.height / 2 },
      };
    },
    [name, block, at] as const,
  );

/** Whether a collaborator's caret is drawn within a pixel or two of the start of the character at `at` of a host. */
export const onCharacter = async (page: Page, name: string, block: string, at: number) => {
  const { caret, point } = await boxes(page, name, block, at);
  return Math.abs(caret.x - point.x) < 3 && caret.top <= point.y && point.y <= caret.bottom;
};
