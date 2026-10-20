import type { MouseEvent } from 'react';

const CONTROL_ROLES = [
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'tab',
  'menuitem',
  'option',
  'textbox',
  'combobox',
];

const INTERACTIVE = [
  'a, button, input, textarea, select, label, iframe, summary, video, audio',
  '[contenteditable]:not([contenteditable="false"]), [tabindex]',
  ...CONTROL_ROLES.map((role) => `[role="${role}"]`),
].join(', ');

/**
 * Whether a press inside a void block landed on a control of its own, which keeps the press. The shell around the block
 * carries a tabindex, so only a control inside the block's root counts.
 */
export function isInteractive(root: HTMLElement | null, event: MouseEvent): boolean {
  const control = (event.target as Element).closest(INTERACTIVE);
  return control !== null && control !== root && root?.contains(control) === true;
}
