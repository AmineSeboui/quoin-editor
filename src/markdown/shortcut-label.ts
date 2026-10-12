import { isMac } from './platform';

const MAC_LABEL: Record<string, string> = { mod: '⌘', alt: '⌥', shift: '⇧' };
const OTHER_LABEL: Record<string, string> = { mod: 'Ctrl', alt: 'Alt', shift: 'Shift' };

/** Renders a "mod+shift+b" style hint as the platform's own label, such as ⌘⇧B on a Mac and Ctrl+Shift+B elsewhere. */
export function formatShortcut(hint: string): string {
  const mac = isMac();
  const labels = mac ? MAC_LABEL : OTHER_LABEL;
  const parts = hint.split('+').map((part) => labels[part] ?? part.toUpperCase());
  return parts.join(mac ? '' : '+');
}
