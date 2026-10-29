import { expect, test } from "@playwright/test";
import { caretAt, markdown, modelSelection, openHeadless } from "../../support/headless";

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
  await expect
    .poll(() => modelSelection(page))
    .toMatchObject({ kind: "text", head: { block: "c" } });
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(() => modelSelection(page))
    .toMatchObject({ kind: "text", head: { block: "a" } });
});

test("a click on the fallback of a text block selects the block as a whole, so Delete removes it", async ({ page }) => {
  await openHeadless(page, "throwing");
  await caretAt(page, 0, 0);
  await page.getByRole("group", { name: "Block could not be drawn" }).click();
  await expect
    .poll(() => modelSelection(page))
    .toEqual({ kind: "blocks", anchor: "b", head: "b" });
  await page.keyboard.press("Delete");
  await expect(
    page.getByRole("group", { name: "Block could not be drawn" }),
  ).toHaveCount(0);
  expect(await markdown(page)).toEqual(["above", "below"]);
});
