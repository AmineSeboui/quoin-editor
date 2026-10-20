'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { DragBox } from './drag-layout';

export type DragOverlayHandle = {
  /** Shows copies of the shells over the box they cover, in viewport coordinates. */
  show(shells: readonly HTMLElement[], box: DragBox): void;
  /** Moves the copies by the distance the pointer travelled since the drag started. */
  follow(dx: number, dy: number): void;
  /** Draws the drop line, in coordinates relative to the editor root's padding box. */
  mark(line: DragBox): void;
  hide(): void;
};

const UNIQUE_OR_FOCUSABLE = ['id', 'data-block-id', 'contenteditable', 'tabindex'];

// A copy keeps the classes and data attributes that style it, but nothing that identifies or focuses a block, and a
// copied frame would load its page again.
function copyOf(shell: HTMLElement): Node {
  const copy = shell.cloneNode(true) as HTMLElement;
  for (const element of [copy, ...copy.querySelectorAll('*')]) {
    for (const name of UNIQUE_OR_FOCUSABLE) element.removeAttribute(name);
  }
  for (const frame of copy.querySelectorAll('iframe')) frame.removeAttribute('src');
  return copy;
}

const place = (element: HTMLElement, { top, left, width }: DragBox) =>
  Object.assign(element.style, { top: `${top}px`, left: `${left}px`, width: `${width}px` });

// The copies are fixed rather than absolute so that dragging them past the end of the page does not lengthen it.
// The origin a fixed element takes is read back, in case an ancestor transform moved it from the viewport's corner.
export const DragOverlay = forwardRef<DragOverlayHandle>(function DragOverlay(_props, ref) {
  const ghost = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    show(shells, box) {
      const element = ghost.current;
      if (element === null) return;
      element.hidden = false;
      element.inert = true;
      Object.assign(element.style, { top: '0px', left: '0px', transform: '' });
      const origin = element.getBoundingClientRect();
      place(element, { ...box, top: box.top - origin.top, left: box.left - origin.left });
      element.replaceChildren(...shells.map(copyOf));
    },
    follow(dx, dy) {
      if (ghost.current) ghost.current.style.transform = `translate(${dx}px, ${dy}px)`;
    },
    mark(box) {
      const element = line.current;
      if (element === null) return;
      element.hidden = false;
      place(element, { ...box, top: box.top - 1 });
    },
    hide() {
      ghost.current?.replaceChildren();
      if (ghost.current) ghost.current.hidden = true;
      if (line.current) line.current.hidden = true;
    },
  }));

  return (
    <>
      <div
        ref={ghost}
        hidden
        aria-hidden="true"
        data-quoin-drag-ghost=""
        className="pointer-events-none fixed z-20 opacity-50"
      />
      <div
        ref={line}
        hidden
        aria-hidden="true"
        data-quoin-drop-line=""
        className="pointer-events-none absolute z-20 h-0 border-t-2 border-ring"
      />
    </>
  );
});
