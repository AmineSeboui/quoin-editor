/** One of the tones a callout is drawn in, which the names of the tones in the labels are keyed by. */
export type CalloutTone = 'info' | 'tip' | 'success' | 'warning' | 'danger';

/** The tones a callout is drawn in. A tone outside the list is drawn, named and exported as `info`. */
export const CALLOUT_TONES: readonly CalloutTone[] = ['info', 'tip', 'success', 'warning', 'danger'];

/**
 * The tone a callout is drawn in. A document may carry anything in the attribute, from untyped host code or from a
 * version that knew another tone, and only these five are painted, so the view, the canvas and the Word export all
 * fall back here rather than passing an unknown value through to a `data-tone` nothing styles and an accessible name
 * nobody reads.
 */
export function calloutTone(value: unknown): CalloutTone {
  return CALLOUT_TONES.find((tone) => tone === value) ?? 'info';
}
