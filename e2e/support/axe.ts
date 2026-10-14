import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

// The ids of the rules the editor breaks, so a failing spec says which. Only the editor is scanned: the page around it is
// the harness's.
export async function axeViolations(page: Page, impacts: 'all' | 'serious' = 'all'): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).include('.quoin-editor').analyze();
  return violations
    .filter((violation) => impacts === 'all' || violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => violation.id);
}
