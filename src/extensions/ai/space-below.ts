function rowGap(parent: Element | null): number {
  if (parent === null) return 0;
  const { display, flexDirection, rowGap: gap } = getComputedStyle(parent);
  const column = display.includes('grid') || (display.includes('flex') && flexDirection.startsWith('column'));
  return column ? parseFloat(gap) || 0 : 0;
}

/**
 * The room a host already leaves under a block that an answer can use: the block's bottom padding when it draws nothing
 * there, no bottom border and no background, and the row gap of a flex column or grid it is laid out in.
 */
export function spaceBelow(shell: Element): { padding: number; gap: number } {
  const own = getComputedStyle(shell);
  const drawn = parseFloat(own.borderBottomWidth) || own.backgroundColor + own.backgroundImage !== 'rgba(0, 0, 0, 0)none';
  const padding = drawn ? 0 : parseFloat(own.paddingBottom) || 0;
  return { padding, gap: rowGap(shell.parentElement) };
}
