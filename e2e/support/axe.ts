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

// The ids of the rules the editor breaks, so a failing spec says which. Only the editor is scanned by default: the page
// around it is the harness's. '.quoin' also takes in the menus, toolbars and dialogs the canvas portals out of it, and
// a role scans one of them alone.
export async function axeViolations(
  page: Page,
  impacts: 'all' | 'serious' = 'all',
  scope: '.quoin-editor' | '.quoin' | '[role="menu"]' = '.quoin-editor',
): Promise<string[]> {
  await settleAnimations(page);
  const { violations } = await new AxeBuilder({ page }).include(scope).analyze();
  return violations
    .filter((violation) => impacts === 'all' || violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => violation.id);
}
