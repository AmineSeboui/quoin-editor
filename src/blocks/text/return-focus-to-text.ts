import type { ViewController } from '../../view';

// Radix hands focus back to a menu's trigger on close. A trigger inside a block is out of the tab order and takes no
// typing, so focus goes back to the caret instead, unless a press outside the menu has already moved it elsewhere: by
// the time this runs the menu is gone, and focus that was in it has fallen to the body.
export function returnFocusToText(controller: ViewController): (event: Event) => void {
  return (event) => {
    event.preventDefault();
    const focused = controller.root?.ownerDocument.activeElement;
    if (!focused || focused === focused.ownerDocument.body) controller.focus();
  };
}
