import type { ViewController } from '../../view';

// By the time a menu's close handler runs the menu is gone, and focus that was in it has fallen to the body. Focus a
// press outside the menu put in the text, or on a control outside the editor, stays where the press put it.
function pressKeptFocus(controller: ViewController, focused: Element | null | undefined): boolean {
  if (!focused || focused === focused.ownerDocument.body) return false;
  return controller.isEditorElement(focused) || !controller.root?.contains(focused);
}

// Radix hands focus back to a menu's trigger on close. A trigger inside a block is out of the tab order and takes no
// typing, so focus goes back to the caret instead, from the body or from any control of the editor that is not text.
export function returnFocusToText(controller: ViewController): (event: Event) => void {
  return (event) => {
    event.preventDefault();
    if (!pressKeptFocus(controller, controller.root?.ownerDocument.activeElement)) controller.focus();
  };
}
