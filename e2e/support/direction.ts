import { test, type Locator } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };

// A project named for the direction turns the harness round, so a spec written once runs both ways and the suite does
// not have to be kept twice. The language is left alone, since these specs find almost everything by its English name.
export const rightToLeft = () => /(^|-)rtl$/.test(test.info().project.name);

// A horizontal arrow names a side of the screen. Where lines run right to left, the left arrow is the one that moves on
// along a row of controls and from one block into the next, which the canvas decides.
export const forward = () => (rightToLeft() ? 'ArrowLeft' : 'ArrowRight');
export const backward = () => (rightToLeft() ? 'ArrowRight' : 'ArrowLeft');

/** A box's x measured from the side of the page where lines start, so a layout check is written once for both ways. */
export const inlineX = (box: Pick<Box, 'x' | 'width'>, pageWidth: number) =>
  rightToLeft() ? pageWidth - box.x - box.width : box.x;

/** The x `inset` px in from the side of the box where lines start, or with `end` from the side where they end. */
export const edgeX = (box: Pick<Box, 'x' | 'width'>, inset: number, end = false) =>
  rightToLeft() !== end ? box.x + box.width - inset : box.x + inset;

/** A horizontal distance on the screen that goes `distance` px the way the lines run. */
export const onward = (distance: number) => (rightToLeft() ? -distance : distance);

// Within a block the browser decides, and the English words of the harness on a right to left line are a left to right
// run that the browsers read differently. Chromium reads a press at the edge of the line and every arrow by the
// direction of the line. Firefox reads them all by the direction of the words, as on a left to right page. WebKit reads
// a press and an arrow with Shift by the line, and an arrow alone by the words.
function byLine(gesture: 'press' | 'extend' | 'move'): boolean {
  if (!rightToLeft()) return false;
  const engine = test.info().project.name.replace(/-rtl$/, '');
  return engine === 'chromium' || (engine === 'webkit' && gesture !== 'move');
}

/** The arrow that moves the caret on through the words, or with `extend` the one that selects on. */
export const onThroughText = (extend = false) => (byLine(extend ? 'extend' : 'move') ? 'ArrowLeft' : 'ArrowRight');
export const backThroughText = (extend = false) => (onThroughText(extend) === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft');

/** The x `inset` px in from the side of a line of text where a press lands at its start. */
export const fromLineStart = (box: Box, inset: number) => (byLine('press') ? box.x + box.width - inset : box.x + inset);

/** A click's position on the element `inset` px in from the side of its first line where a press is the start. */
export async function lineStart(element: Locator, y: number, inset = 1) {
  const { width } = (await element.boundingBox())!;
  return { x: fromLineStart({ x: 0, y: 0, width, height: 0 }, inset), y };
}

/** A click's position on the element 1 px in from the side of its first line where a press is the end. */
export async function lineEnd(element: Locator, y: number) {
  const { width } = (await element.boundingBox())!;
  return { x: fromLineStart({ x: 0, y: 0, width, height: 0 }, width - 1), y };
}
