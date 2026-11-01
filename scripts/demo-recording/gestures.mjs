export const TYPE_STEP = 60;

export const RESTING_POINT = { x: 1180, y: 660 };

export const centre = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

export async function type(page, recorder, text) {
  for (const character of text) {
    await page.keyboard.type(character);
    await recorder.hold(TYPE_STEP);
  }
}

export async function press(page, recorder, key, pause = 300) {
  await page.keyboard.press(key);
  await recorder.hold(pause);
}

export async function glide(page, recorder, to, steps = 8) {
  const from = await page.evaluate(() => window.__demoCursor);
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * step) / steps, from.y + ((to.y - from.y) * step) / steps);
    await recorder.hold(TYPE_STEP);
  }
}

export async function clickAt(page, recorder, point) {
  await glide(page, recorder, point);
  await page.mouse.down();
  await page.mouse.up();
}

export async function clickOn(page, recorder, locator, pause = 300) {
  await locator.waitFor();
  await clickAt(page, recorder, centre(await locator.boundingBox()));
  await recorder.hold(pause);
}

/** The left and right edges of a text block's own text and its middle line, rather than of the full-width block. */
export function textSpan(host) {
  return host.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = [...range.getClientRects()];
    const first = rects[0];
    const last = rects.at(-1);
    return { left: first.left, right: last.right, y: last.top + last.height / 2 };
  });
}

/**
 * Records frames until `done` resolves true, for a change the page makes on its own, such as a streamed answer. Each
 * frame is shown for the time that really passed, so the change plays at its own speed.
 */
export async function film(page, recorder, done, step = 90) {
  let previous = Date.now();
  while (!(await done())) {
    await page.waitForTimeout(step);
    const now = Date.now();
    await recorder.hold(now - previous);
    previous = now;
  }
}

/** Clicks the empty page beside the editor, so the last frames show no menu, toolbar or caret. */
export async function leaveEditor(page, recorder) {
  await clickAt(page, recorder, RESTING_POINT);
}
