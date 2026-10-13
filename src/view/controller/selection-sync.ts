export type SelectionSync = { start(): void; stop(): void; suppressNext(): void };

// A write that leaves the selection where it was fires no event, so a suppression nothing consumed expires on the next
// macrotask rather than swallowing the user's next change.
export function createSelectionSync(doc: Document, onChange: () => void): SelectionSync {
  let suppressed = false;
  let expiry: ReturnType<typeof setTimeout> | null = null;

  function release(): void {
    suppressed = false;
    if (expiry !== null) clearTimeout(expiry);
    expiry = null;
  }

  function handle(): void {
    if (suppressed) release();
    else onChange();
  }

  return {
    start: () => doc.addEventListener('selectionchange', handle),
    stop() {
      doc.removeEventListener('selectionchange', handle);
      release();
    },
    suppressNext() {
      suppressed = true;
      expiry ??= setTimeout(release, 0);
    },
  };
}
