/** Whether a key belongs to an IME composition, such as the Enter that commits a candidate. */
export const isComposing = (event: KeyboardEvent): boolean => event.isComposing || event.keyCode === 229;
