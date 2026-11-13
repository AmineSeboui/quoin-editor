import { focusSink } from '../selection/selection-sink';
import { hasFocus } from './focus-ownership';
import type { ViewController } from './view-controller';

export type FocusFollow = {
  /** Gives focus to the element the selection is in: a host, a block's shell or the sink. */
  take(preventScroll?: boolean): void;
  /** Takes focus as `take` does, unless an input method is composing, which moving focus would cancel. */
  keep(preventScroll?: boolean): void;
  /** Writes the selection back into a host whose redraw replaced the nodes it sat in. */
  rewrite(host: HTMLElement): void;
};

// React replaces a host whose block changes kind, which drops focus, and Firefox does not move focus into another host
// when a script selects inside it. A redraw of the decorations alone, such as one that follows a selection the browser
// made, replaces the nodes that selection sits in, and nothing else writes it back. It is written only while the editor
// holds focus: written while focus is on the page, it would pull focus into the line.
export function createFocusFollow(controller: ViewController, focusElement: () => HTMLElement | undefined): FocusFollow {
  const take = (preventScroll?: boolean): void => {
    const element = focusElement();
    if (!element || element.ownerDocument.activeElement === element) return;
    if (element === controller.sink) focusSink(controller);
    else element.focus({ preventScroll });
  };
  return {
    take,
    keep(preventScroll) {
      if (controller.composingKey === null) take(preventScroll);
    },
    rewrite(host) {
      const inSelection = host.contains(controller.domSelection()?.focusNode ?? null);
      if (inSelection && hasFocus(controller, host.ownerDocument)) controller.syncSelectionToDom();
    },
  };
}
