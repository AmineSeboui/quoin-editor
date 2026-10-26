import { expect, test } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';
import { caretOf } from '../../support/presence';

const NAME = 'Augusta Ada King Countess of Lovelace Byron';

test("cuts a long name off before the avatars' gutter", async ({ page }) => {
  const markdown = async (on: typeof page) => (await blocks(on)).map((block) => String(block.data.markdown));
  await openEditor(page, 'sample', `collab=presence&user=${encodeURIComponent(NAME)}&color=%23b91c1c`);
  const bea = await page.context().newPage();
  await bea.setViewportSize({ width: 640, height: 720 });
  await openEditor(bea, 'empty', 'collab=presence&user=Bea&color=%231d4ed8&seed=0');
  await expect.poll(() => markdown(bea)).toEqual(await markdown(page));
  const line = ' Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt';
  await page.evaluate((text) => {
    const { controller } = window.__quoin;
    controller!.focus({ block: 'b', region: 'text', offset: 'First paragraph.'.length });
    controller!.editor.commands.insertText(text);
  }, line);
  await expect.poll(async () => (await markdown(bea))[1]).toContain('incididunt');
  const end = await bea.evaluate(() => {
    const host = document.querySelector('[data-block-id="b"] [data-quoin-host]')!;
    const text = host.firstChild as Text;
    const range = document.createRange();
    const topOf = (at: number) => {
      range.setStart(text, at - 1);
      range.setEnd(text, at);
      return range.getClientRects()[0]?.top;
    };
    let last = 1;
    while (last < text.length && topOf(last + 1) === topOf(1)) last++;
    return last - 1;
  });
  await page.evaluate((offset) => window.__quoin.controller!.focus({ block: 'b', region: 'text', offset }), end);
  await expect(caretOf(bea, NAME)).toBeVisible();
  await expect(bea.getByRole('img', { name: `${NAME} is here` })).toBeVisible();
  const seen = () =>
    bea.evaluate(() => {
      const layer = document.querySelector<HTMLElement>('.quoin-presence-carets')!;
      const inset = getComputedStyle(layer).clipPath.match(/-?[\d.]+/g)?.map(Number);
      const cut = inset === undefined ? Infinity : layer.getBoundingClientRect().right - inset[1];
      const name = document.querySelector('.quoin-presence-name')!.getBoundingClientRect().right;
      const gutter = document.querySelector('.quoin-presence-group')!.getBoundingClientRect().left;
      return { reaches: name > gutter, shown: Math.min(name, cut) <= gutter };
    });
  await expect.poll(seen).toEqual({ reaches: true, shown: true });
});
