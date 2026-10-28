import { expect, test } from "@playwright/test";
import { caretAt, modelSelection, openHeadless } from "../../support/headless";

test("arrow keys pass over a block whose renderer threw", async ({ page }) => {
  await openHeadless(page, "throwing");
  await expect(
    page.getByRole("group", { name: "Block could not be drawn" }),
  ).toBeVisible();
  await caretAt(page, 0, 0);
  await expect
    .poll(() => modelSelection(page))
    .toMatchObject({ kind: "text", head: { block: "a" } });
  await page.keyboard.press("ArrowDown");
  console.log(JSON.stringify(await modelSelection(page)));
  await expect
    .poll(() => modelSelection(page))
    .toMatchObject({ kind: "text", head: { block: "c" } });
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(() => modelSelection(page))
    .toMatchObject({ kind: "text", head: { block: "a" } });
});
