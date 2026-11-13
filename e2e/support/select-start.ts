import type { Locator } from '@playwright/test';
import { lineStart, onThroughText } from './direction';

/** Puts the caret at the start of the element's first line with a click or a tap, then selects on with Shift. */
export async function selectFromStart(element: Locator, characters: number, press: 'click' | 'tap' = 'click') {
  await element[press]({ position: await lineStart(element, 12) });
  for (let i = 0; i < characters; i++) await element.page().keyboard.press(`Shift+${onThroughText(true)}`);
}
