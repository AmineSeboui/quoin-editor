function rowGap(parent: Element | null): number {
  if (parent === null) return 0;
  const { display, flexDirection, rowGap: gap } = getComputedStyle(parent);
  const column = display.includes('grid') || (display.includes('flex') && flexDirection.startsWith('column'));
  return column ? parseFloat(gap) || 0 : 0;
}

/**
 * The room a host already leaves under a block that an answer can use: the block's bottom padding when no bottom border
 * is drawn under it, and the row gap of a flex column or grid it is laid out in.
 */
export function spaceBelow(shell: Element): { padding: number; gap: number } {
  const { borderBottomWidth, paddingBottom } = getComputedStyle(shell);
  const padding = parseFloat(borderBottomWidth) > 0 ? 0 : parseFloat(paddingBottom) || 0;
  return { padding, gap: rowGap(shell.parentElement) };
}
