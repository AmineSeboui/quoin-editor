import { act } from '@testing-library/react';

const selectionChanged = () => void document.dispatchEvent(new Event('selectionchange'));

/** Selects text in a host as a long press on a phone does: through the page's selection, leaving focus where it was. */
export function selectByLongPress(host: HTMLElement, from: number, to: number): void {
  const text = document.createTreeWalker(host, NodeFilter.SHOW_TEXT).nextNode()!;
  act(() => {
    document.getSelection()!.setBaseAndExtent(text, from, text, to);
    selectionChanged();
  });
}

/** Moves the page's selection out of the canvas, as a tap elsewhere on the page does. */
export function selectOutside(): void {
  act(() => {
    document.getSelection()!.collapse(document.body, 0);
    selectionChanged();
  });
}
