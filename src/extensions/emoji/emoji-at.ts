/** The emoji of the cell an event happened in, or null outside every cell. */
export const emojiAt = (target: EventTarget | null): string | null =>
  target instanceof Element ? (target.closest('[data-emoji]')?.getAttribute('data-emoji') ?? null) : null;
