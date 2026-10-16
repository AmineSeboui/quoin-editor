import { HIGHLIGHT_BAR } from './focus';
import { TAP_TARGET_FLOOR } from './touch-target';

/** The classes the dropdown menu and the context menu share, so the block menu reads the same opened either way. */
export const MENU_CONTENT =
  'quoin bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0';

export const MENU_SUB_CONTENT =
  'quoin bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg';

export const MENU_ITEM = [
  "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm focus:outline-hidden select-none data-[inset]:pl-8 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4",
  HIGHLIGHT_BAR,
  TAP_TARGET_FLOOR,
].join(' ');

export const MENU_CHECKABLE_ITEM = [
  'focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm focus:outline-hidden select-none',
  HIGHLIGHT_BAR,
].join(' ');

export const MENU_ITEM_INDICATOR = 'pointer-events-none absolute left-2 flex size-3.5 items-center justify-center';

export const MENU_SUB_TRIGGER = [
  'focus:bg-accent data-[state=open]:bg-accent flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm focus:outline-hidden select-none data-[inset]:pl-8',
  HIGHLIGHT_BAR,
].join(' ');

export const MENU_LABEL = 'px-2 py-1.5 text-sm font-medium data-[inset]:pl-8';

export const MENU_SEPARATOR = 'bg-border -mx-1 my-1 h-px';

export const MENU_SHORTCUT = 'text-muted-foreground ml-auto text-xs tracking-widest';
