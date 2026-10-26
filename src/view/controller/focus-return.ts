import { listen } from '../dom/listen';

// A press places the caret itself once focus has moved. Focus that comes back any other way, by Tab for one, finds the
// caret the browser left in the host, which a render or a model change made while focus was away has made stale.
export function watchFocusReturn(
  root: HTMLElement,
  handlers: { pressed(): void; returned(target: Element): void },
): () => void {
  let pressed = false;
  const onPointerDown = () => {
    pressed = true;
    handlers.pressed();
  };
  const onFocusIn = (event: FocusEvent) => {
    const byPress = pressed;
    pressed = false;
    if (!byPress) handlers.returned(event.target as Element);
  };
  const onFocusOut = (event: FocusEvent) => {
    if (!root.contains(event.relatedTarget as Node | null)) pressed = false;
  };
  const unlistenPress = listen(root, { pointerdown: onPointerDown }, true);
  const unlistenFocus = listen(root, { focusin: onFocusIn, focusout: onFocusOut });
  return () => {
    unlistenPress();
    unlistenFocus();
  };
}
