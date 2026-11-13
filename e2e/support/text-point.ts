import type { Locator } from '@playwright/test';

type Point = { x: number; y: number };

/**
 * A click's position in the middle of where `text` is drawn in the element. A word found by its text rather than by a
 * distance from an edge is the same word whichever way the lines run, and left to right words on a right to left line
 * still read from the left.
 */
export function textPoint(element: Locator, text: string): Promise<Point> {
  return element.evaluate((node, wanted) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let at = walker.nextNode(); at !== null; at = walker.nextNode()) {
      const index = at.textContent!.indexOf(wanted);
      if (index < 0) continue;
      const range = document.createRange();
      range.setStart(at, index);
      range.setEnd(at, index + wanted.length);
      const [drawn, box] = [range.getClientRects()[0], node.getBoundingClientRect()];
      return { x: drawn.left + drawn.width / 2 - box.left, y: drawn.top + drawn.height / 2 - box.top };
    }
    throw new Error(`The element has no text "${wanted}"`);
  }, text);
}

/** A click's position in the middle of the element's first word. */
export async function firstWordPoint(element: Locator): Promise<Point> {
  const [word] = (await element.innerText()).match(/[\p{L}\p{N}]+/u)!;
  return textPoint(element, word);
}

/**
 * A click's position that puts the caret `offset` characters into the element's text: just inside the near edge of the
 * character after it, on the side the character before it is drawn. Between two characters of one run of words that
 * edge is the same place in every browser, where the start or the end of left to right words on a right to left line
 * is not.
 */
export function caretPoint(element: Locator, offset: number): Promise<Point> {
  return element.evaluate((node, wanted) => {
    const rectOf = (index: number) => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let start = 0;
      for (let at = walker.nextNode(); at !== null; at = walker.nextNode()) {
        const length = at.textContent!.length;
        if (index < start + length) {
          const range = document.createRange();
          range.setStart(at, index - start);
          range.setEnd(at, index - start + 1);
          return range.getBoundingClientRect();
        }
        start += length;
      }
      throw new Error(`The element's text is shorter than ${index + 1} characters`);
    };
    const [before, after, box] = [rectOf(wanted - 1), rectOf(wanted), node.getBoundingClientRect()];
    const inset = Math.min(2, after.width / 4);
    const x = after.left >= before.left ? after.left + inset : after.right - inset;
    return { x: x - box.left, y: after.top + after.height / 2 - box.top };
  }, offset);
}

/** A click's position that puts the caret right before the first place `text` is in the element's text. */
export async function caretBefore(element: Locator, text: string): Promise<Point> {
  const offset = (await element.textContent())!.indexOf(text);
  if (offset < 1) throw new Error(`The element's text has no "${text}" after its first character`);
  return caretPoint(element, offset);
}
