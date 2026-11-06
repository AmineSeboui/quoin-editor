import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

// Contrast is measured once every finite animation has run: half way through a fade, text is only half as dark.
function settleAnimations(page: Page) {
  return page.evaluate(() =>
    Promise.allSettled(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)))
        .map((animation) => animation.finished),
    ),
  );
}

type Scope = '.quoin-editor' | '.quoin' | 'main' | `[role="${'menu' | 'listbox' | 'dialog' | 'toolbar'}"]`;

type Violation = { id: string; impact?: string | null; nodes: readonly { target: unknown }[] };

const SCROLLING = 'scrollable-region-focusable';

// The code of an editable code block scrolls with the caret, which reaches it through the editor's one tab stop, as a
// text field's content does, so its scroller needs no tab stop of its own.
const EDITABLE_CODE = '.quoin-code-scroll[data-quoin-native]';

const selectorsOf = (violation: Violation) =>
  violation.nodes
    .flatMap(({ target }) => (Array.isArray(target) ? target : [target]))
    .filter((selector): selector is string => typeof selector === 'string');

/** Whether anything the scrolling rule caught is a scroller of its own rather than the code of an editable block. */
const scrollsOutsideEditableCode = (page: Page, violation: Violation) =>
  page.evaluate(
    ({ selectors, editableCode }) =>
      selectors.some((selector) => {
        const node = document.querySelector(selector);
        return node !== null && node.closest(editableCode) === null;
      }),
    { selectors: selectorsOf(violation), editableCode: EDITABLE_CODE },
  );

/**
 * The ids of the rules the editor breaks, so a failing spec says which. Only the editor is scanned by default: the page
 * around it is the harness's. '.quoin' also takes in the menus, toolbars and dialogs the canvas portals out of it, and
 * a role scans one of them alone.
 */
export async function axeViolations(
  page: Page,
  impacts: 'all' | 'serious' = 'all',
  scope: Scope | readonly Scope[] = '.quoin-editor',
): Promise<string[]> {
  await settleAnimations(page);
  const builder = new AxeBuilder({ page });
  for (const selector of ([] as Scope[]).concat(scope)) builder.include(selector);
  const { violations } = await builder.analyze();
  const reported: Violation[] = [];
  for (const violation of violations) {
    if (violation.id !== SCROLLING || (await scrollsOutsideEditableCode(page, violation))) reported.push(violation);
  }
  return reported
    .filter((violation) => impacts === 'all' || violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => violation.id);
}
