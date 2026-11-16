/** shadcn's keyboard focus: a 3px halo of --quoin-ring at half strength, and the border in --quoin-ring where the
 *  control has one. Forced-colors mode drops the halo, so the base layer in styles.css draws a system-colour outline
 *  on every focused element there. */
export const FOCUS_RING = 'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

/** The ring for a control with no border to colour: a full-strength 1px edge inside it, which reaches 3:1, under the
 *  same halo. */
export const FOCUS_RING_BORDERLESS = `${FOCUS_RING} focus-visible:inset-ring-1 focus-visible:inset-ring-ring`;
