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

type Scope = '.quoin-editor' | '.quoin' | `[role="${'menu' | 'listbox' | 'dialog' | 'toolbar'}"]`;

// The ids of the rules the editor breaks, so a failing spec says which. Only the editor is scanned by default: the page
// around it is the harness's. '.quoin' also takes in the menus, toolbars and dialogs the canvas portals out of it, and
// a role scans one of them alone.
const SCROLLING = 'scrollable-region-focusable';

// The code of an editable code block scrolls with the caret, which reaches it through the editor's one tab stop, as a
// text field's content does, so its scroller needs no tab stop of its own.
const EDITABLE_CODE = '.quoin-code-scroll[data-quoin-native]';

export async function axeViolations(
  page: Page,
  impacts: 'all' | 'serious' = 'all',
  scope: Scope | readonly Scope[] = '.quoin-editor',
): Promise<string[]> {
  await settleAnimations(page);
  const scoped = () => {
    const builder = new AxeBuilder({ page });
    for (const selector of ([] as Scope[]).concat(scope)) builder.include(selector);
    return builder;
  };
  const { violations } = await scoped().disableRules([SCROLLING]).analyze();
  const scrolling = await scoped().withRules([SCROLLING]).exclude(EDITABLE_CODE).analyze();
  return [...violations, ...scrolling.violations]
    .filter((violation) => impacts === 'all' || violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => violation.id);
}
