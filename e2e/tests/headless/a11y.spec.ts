import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { caretAt, host, modelSelection, openHeadless } from '../../support/headless';

async function serious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).include('.quoin-editor').analyze();
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);
}

test('the headless editor has no serious accessibility violations in any state', async ({ page }) => {
  await openHeadless(page, 'sample');
  expect(await serious(page)).toEqual([]);
  await caretAt(page, 0, 1);
  await expect.poll(() => modelSelection(page)).toMatchObject({ kind: 'text', anchor: { block: 'h', offset: 1 } });
  expect(await serious(page)).toEqual([]);
  const a = (await host(page, 0).boundingBox())!;
  const b = (await host(page, 2).boundingBox())!;
  await page.mouse.move(a.x + 4, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 4, b.y + b.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(() => modelSelection(page))
    .toMatchObject({ kind: 'text', anchor: { block: 'h' }, head: { block: 'b' } });
  expect(await serious(page)).toEqual([]);
  await page.locator('[data-type="DIVIDER"]').click();
  await expect.poll(() => modelSelection(page)).toMatchObject({ kind: 'node', block: 'd' });
  expect(await serious(page)).toEqual([]);
});
