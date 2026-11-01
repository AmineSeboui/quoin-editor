import { clickAt, clickOn, film, glide, leaveEditor, press, textSpan, type } from './gestures.mjs';

const hosts = (page) => page.locator('[data-island] .quoin-editor [data-quoin-host]');
const accept = (page) => page.getByRole('group', { name: 'AI response' }).getByRole('button', { name: 'Accept' });

async function dragAcross(page, recorder, host) {
  const { left, right, y } = await textSpan(host);
  await clickAt(page, recorder, { x: left + 1, y });
  await page.mouse.down();
  await glide(page, recorder, { x: right - 1, y }, 14);
  await page.mouse.up();
  await recorder.hold(500);
}

async function acceptAnswer(page, recorder) {
  await film(page, recorder, () => accept(page).isVisible());
  await recorder.hold(700);
  await clickOn(page, recorder, accept(page), 900);
}

/** A draft line fixed through the toolbar's Ask AI, then a new line written with the Continue writing command. */
export async function aiSession(page, recorder) {
  await recorder.hold(800);
  await dragAcross(page, recorder, hosts(page).nth(1));
  await clickOn(page, recorder, page.getByRole('toolbar', { name: 'Text formatting' }).getByRole('button', { name: 'Ask AI' }), 700);
  await clickOn(page, recorder, page.getByRole('option', { name: 'Fix spelling and grammar' }), 200);
  await acceptAnswer(page, recorder);
  await clickOn(page, recorder, hosts(page).last(), 300);
  await type(page, recorder, '/continue');
  await page.getByRole('option', { name: /Continue writing/ }).first().waitFor();
  await recorder.hold(700);
  await press(page, recorder, 'Enter', 200);
  await acceptAnswer(page, recorder);
  await leaveEditor(page, recorder);
  await recorder.hold(3000);
}
