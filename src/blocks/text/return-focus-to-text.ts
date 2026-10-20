import type { ViewController } from '../../view';

// By the time a menu's close handler runs the menu is gone, and focus that was in it has fallen to the body. A press
// on a menu button in the editor, the menu's own trigger among them, leaves focus on a button that is out of the tab
// order and takes no typing. Anywhere else, focus stays where the press put it.
function focusBelongsInText(controller: ViewController, focused: Element | null | undefined): boolean {
  if (!focused || focused === focused.ownerDocument.body) return true;
  return focused.getAttribute('aria-haspopup') === 'menu' && controller.root?.contains(focused) === true;
}

// Radix hands focus back to a menu's trigger on close, so focus goes back to the caret instead.
export function returnFocusToText(controller: ViewController): (event: Event) => void {
  return (event) => {
    event.preventDefault();
    if (focusBelongsInText(controller, controller.root?.ownerDocument.activeElement)) controller.focus();
  };
}
