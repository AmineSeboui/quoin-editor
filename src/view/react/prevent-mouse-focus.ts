import type { MouseEvent } from 'react';

// A control inside a block must not take focus from the host the writer is typing in.
export const keepFocus = (event: MouseEvent): void => event.preventDefault();
