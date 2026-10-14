// A press places the caret itself once focus has moved. Focus that comes back any other way, by Tab for one, finds the
// caret the browser left in the host, which a render or a model change made while focus was away has made stale.
export function watchFocusReturn(root: HTMLElement, returned: (target: Element) => void): () => void {
  let pressed = false;
  const onPointerDown = () => {
    pressed = true;
  };
  const onFocusIn = (event: FocusEvent) => {
    const byPress = pressed;
    pressed = false;
    if (!byPress) returned(event.target as Element);
  };
  const onFocusOut = (event: FocusEvent) => {
    if (!root.contains(event.relatedTarget as Node | null)) pressed = false;
  };
  root.addEventListener('pointerdown', onPointerDown, true);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  return () => {
    root.removeEventListener('pointerdown', onPointerDown, true);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
  };
}
