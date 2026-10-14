import type { ViewController } from './view-controller';

export function hasFocus(controller: ViewController, doc: Document | null): boolean {
  const active = doc?.activeElement ?? null;
  return active !== null && controller.isEditorElement(active);
}

// Chromium and WebKit move focus into an editable host when a script selects inside it, so the model selection is only
// written while focus is on the editor or on nothing, never pulled away from a control the user is typing in. Chromium
// and Firefox leave the DOM selection in a host when a button outside takes focus, and a re-render then collapses it,
// so the DOM selection is not read back either until focus returns.
export function ownsFocus(controller: ViewController, doc: Document): boolean {
  const active = doc.activeElement;
  return !active || active === doc.body || active === controller.root || hasFocus(controller, doc);
}
