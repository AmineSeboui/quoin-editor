import { clsx, type ClassValue } from 'clsx';

const DISPLAY = new Set(['block', 'inline', 'flex', 'inline-flex', 'grid', 'contents', 'hidden']);
const FONT_SIZE = /^text-(xs|sm|base|lg|\d?xl)(\/.+)?$/;
const TEXT_NOT_COLOR = /^text-(left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|shadow-.+|opacity-.+|[[(].*)$/;
const SCALED = /^(p|px|py|ps|pe|pt|pb|pl|pr|w|h|size|min-w|max-w|min-h|max-h|gap-x|gap-y|gap|cursor|overflow-x|overflow-y)-/;
const PADDING_SIDES: Readonly<Record<string, readonly string[]>> = {
  p: ['px', 'py', 'ps', 'pe', 'pt', 'pr', 'pb', 'pl'],
  px: ['ps', 'pe', 'pr', 'pl'],
  py: ['pt', 'pb'],
};

function groupOf(utility: string): string {
  if (DISPLAY.has(utility)) return 'display';
  if (FONT_SIZE.test(utility)) return 'font-size';
  if (utility.startsWith('text-') && !TEXT_NOT_COLOR.test(utility)) return 'color';
  return SCALED.exec(utility)?.[1] ?? utility;
}

/** Joins class names, a later utility dropping an earlier one that sets the same thing under the same variants. The
 *  groups it knows are the ones Quoin's own class lists override: display, font size, text color, padding, width,
 *  height, size, gap, cursor and overflow, a padding shorthand also dropping the sides it sets. Any other two
 *  utilities are both kept, for the stylesheet to order. */
export function cn(...inputs: ClassValue[]): string {
  const taken = new Set<string>();
  const kept: string[] = [];
  for (const name of clsx(inputs).split(/\s+/).reverse()) {
    const variants = name.slice(0, name.lastIndexOf(':') + 1);
    const group = groupOf(name.slice(variants.length));
    if (name === '' || taken.has(variants + group)) continue;
    for (const covered of [group, ...(PADDING_SIDES[group] ?? [])]) taken.add(variants + covered);
    kept.push(name);
  }
  return kept.reverse().join(' ');
}
