export type TabStop = { move(next: HTMLElement | undefined): void };

// React draws every host and shell with tabindex -1 and never rewrites a prop that did not change, so the one tab stop
// is moved by hand onto the element that takes focus, whenever the selection or the drawn elements change.
export function createTabStop(): TabStop {
  let current: HTMLElement | undefined;
  return {
    move(next) {
      if (next === current) return;
      if (current) current.tabIndex = -1;
      if (next) next.tabIndex = 0;
      current = next;
    },
  };
}
