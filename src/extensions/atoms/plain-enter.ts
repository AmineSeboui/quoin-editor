/** Enter with no modifier held. */
export const plainEnter = (event: KeyboardEvent): boolean =>
  event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
