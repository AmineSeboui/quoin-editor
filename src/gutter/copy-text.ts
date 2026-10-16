// The text area goes beside the focused element, so a focus trap around it, such as the open menu the copy came from,
// does not pull focus back before the copy is made.
function copyThroughTextArea(text: string, doc: Document): boolean {
  const previous = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
  const area = doc.createElement('textarea');
  area.value = text;
  area.readOnly = true;
  area.setAttribute('aria-hidden', 'true');
  area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
  const beside = previous !== null && previous !== doc.body ? previous.parentElement : null;
  (beside ?? doc.body).append(area);
  area.focus({ preventScroll: true });
  area.select();
  try {
    return doc.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    previous?.focus({ preventScroll: true });
  }
}

/** Puts plain text on the clipboard, through a hidden text area where the clipboard API is missing or refuses. */
export async function copyText(text: string, doc: Document = document): Promise<boolean> {
  const clipboard = doc.defaultView?.navigator.clipboard;
  if (clipboard === undefined) return copyThroughTextArea(text, doc);
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return copyThroughTextArea(text, doc);
  }
}
