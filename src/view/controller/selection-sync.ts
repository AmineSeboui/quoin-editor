export type SelectionSync = { start(): void; stop(): void; suppressNext(): void };

export type SelectionPoints = readonly [Node | null, number, Node | null, number];

export const selectionPoints = (selection: globalThis.Selection | null): SelectionPoints => [
  selection?.anchorNode ?? null,
  selection?.anchorOffset ?? 0,
  selection?.focusNode ?? null,
  selection?.focusOffset ?? 0,
];

export const samePoints = (a: SelectionPoints, b: SelectionPoints): boolean =>
  a.every((point, index) => point === b[index]);

// A write that leaves the selection where it was fires no event, so a suppression nothing consumed expires on the next
// macrotask rather than swallowing the user's next change. Chromium folds the event of a write and of a move the user
// makes right after it into one, so the event is swallowed only while the selection still holds what was written.
export function createSelectionSync(doc: Document, onChange: () => void): SelectionSync {
  let written: SelectionPoints | null = null;
  let expiry: ReturnType<typeof setTimeout> | null = null;

  function release(): void {
    written = null;
    if (expiry !== null) clearTimeout(expiry);
    expiry = null;
  }

  function handle(): void {
    const suppressed = written;
    release();
    if (suppressed === null || !samePoints(suppressed, selectionPoints(doc.getSelection()))) onChange();
  }

  return {
    start: () => doc.addEventListener('selectionchange', handle),
    stop() {
      doc.removeEventListener('selectionchange', handle);
      release();
    },
    suppressNext() {
      written = selectionPoints(doc.getSelection());
      expiry ??= setTimeout(release, 0);
    },
  };
}
