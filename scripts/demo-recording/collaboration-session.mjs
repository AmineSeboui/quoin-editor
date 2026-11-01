import { centre, clickAt, clickOn, glide, leaveEditor, press, textSpan, type } from './gestures.mjs';

const side = (page, name) => page.getByRole('region', { name: `${name}’s editor` });
const hosts = (region) => region.locator('[data-quoin-host]');
const blocks = (region) => region.locator('[data-quoin-block]');
const handle = (region) => region.getByRole('button', { name: 'Drag to move, click for options' });

async function caretAtEnd(page, recorder, host) {
  const { right, y } = await textSpan(host);
  await clickAt(page, recorder, { x: right + 2, y });
  await press(page, recorder, 'End', 200);
}

async function dragAbove(page, recorder, region, moving, target) {
  await glide(page, recorder, centre(await moving.boundingBox()));
  await recorder.hold(300);
  const grip = centre(await handle(region).boundingBox());
  await glide(page, recorder, grip, 4);
  await recorder.hold(300);
  await page.mouse.down();
  const box = await target.boundingBox();
  await glide(page, recorder, { x: grip.x, y: box.y + 2 }, 12);
  await recorder.hold(500);
  await page.mouse.up();
  await recorder.hold(900);
}

/** Waits until both editors are live and draw the shared document. */
export async function sharedDocument(page) {
  await hosts(side(page, 'Grace')).first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll('[data-island] [data-quoin-host]').length >= 6);
}

/** Two people editing one document: each sees the other's text, ticks and moves arrive with their named caret. */
export async function collaborationSession(page, recorder) {
  const ada = side(page, 'Ada');
  const grace = side(page, 'Grace');
  await recorder.hold(800);
  await caretAtEnd(page, recorder, hosts(ada).last());
  await press(page, recorder, 'Enter', 200);
  await type(page, recorder, 'Write the launch post');
  await recorder.hold(900);
  await caretAtEnd(page, recorder, hosts(grace).first());
  await type(page, recorder, ' for launch');
  await recorder.hold(900);
  await clickOn(page, recorder, grace.getByRole('checkbox').first(), 900);
  await dragAbove(page, recorder, ada, blocks(ada).last(), blocks(ada).nth(2));
  await caretAtEnd(page, recorder, hosts(ada).last());
  await leaveEditor(page, recorder);
  await recorder.hold(3000);
}
