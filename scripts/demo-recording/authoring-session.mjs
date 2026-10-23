const TYPE_STEP = 60;

const editor = (page) => page.locator('[data-island] .quoin-editor').first();
const hosts = (page) => editor(page).locator('[data-quoin-host]');
const handle = (page) => page.getByRole('button', { name: 'Drag to move, click for options' });

async function type(page, recorder, text) {
  for (const character of text) {
    await page.keyboard.type(character);
    await recorder.hold(TYPE_STEP);
  }
}

async function press(page, recorder, key, pause = 300) {
  await page.keyboard.press(key);
  await recorder.hold(pause);
}

async function glide(page, recorder, to, steps = 8) {
  const from = await page.evaluate(() => window.__demoCursor);
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * step) / steps, from.y + ((to.y - from.y) * step) / steps);
    await recorder.hold(TYPE_STEP);
  }
}

const centre = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

/** Clears the sample document so the session starts on one empty paragraph. */
export async function emptyDocument(page) {
  await hosts(page).first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
}

async function boldThroughToolbar(page, recorder, word) {
  for (let index = 0; index < word.length; index += 1) {
    await page.keyboard.press('Shift+ArrowLeft');
    await recorder.hold(TYPE_STEP);
  }
  const bold = page.getByRole('toolbar', { name: 'Text formatting' }).getByRole('button', { name: 'Bold', exact: true });
  await bold.waitFor();
  await recorder.hold(400);
  await glide(page, recorder, centre(await bold.boundingBox()));
  await recorder.hold(300);
  await page.mouse.down();
  await page.mouse.up();
  await recorder.hold(700);
  await page.keyboard.press('End');
}

async function slashCallout(page, recorder, body) {
  await type(page, recorder, '/callout');
  await page.getByRole('option', { name: /Callout/ }).first().waitFor();
  await recorder.hold(700);
  await press(page, recorder, 'Enter', 400);
  await type(page, recorder, body);
}

async function dragAbove(page, recorder, moving, target) {
  await glide(page, recorder, centre(await moving.boundingBox()));
  await recorder.hold(300);
  const grip = centre(await handle(page).boundingBox());
  await glide(page, recorder, grip, 4);
  await recorder.hold(300);
  await page.mouse.down();
  const box = await target.boundingBox();
  await glide(page, recorder, { x: grip.x, y: box.y + 2 }, 12);
  await recorder.hold(500);
  await page.mouse.up();
  await recorder.hold(400);
}

async function clickAt(page, recorder, point) {
  await glide(page, recorder, point);
  await page.mouse.down();
  await page.mouse.up();
}

async function leaveEditor(page, recorder) {
  const last = await hosts(page).last().boundingBox();
  await clickAt(page, recorder, { x: last.x + last.width - 4, y: last.y + last.height / 2 });
  await clickAt(page, recorder, { x: 1180, y: 660 });
}

/** The scripted authoring session the hero animation shows. */
export async function authoringSession(page, recorder) {
  await recorder.hold(800);
  await type(page, recorder, '# Release notes');
  await press(page, recorder, 'Enter');
  await type(page, recorder, '- Blocks on screen');
  await press(page, recorder, 'Enter', 120);
  await type(page, recorder, 'Markdown on disk');
  await press(page, recorder, 'Enter', 120);
  await press(page, recorder, 'Enter');
  await type(page, recorder, 'Every edit stays plain markdown');
  await boldThroughToolbar(page, recorder, 'plain markdown');
  await press(page, recorder, 'Enter');
  await slashCallout(page, recorder, 'Drag a block by its handle to move it.');
  await recorder.hold(500);
  const blocks = editor(page).locator('[data-quoin-block]');
  await dragAbove(page, recorder, blocks.last(), blocks.nth(1));
  await leaveEditor(page, recorder);
  await recorder.hold(3000);
}
