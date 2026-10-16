import type { ViewController } from '../../view';

// Radix hands focus back to a menu's trigger on close. A trigger inside a block is out of the tab order and takes no
// typing, so focus goes back to the caret instead.
export function returnFocusToText(controller: ViewController): (event: Event) => void {
  return (event) => {
    event.preventDefault();
    controller.focus();
  };
}
