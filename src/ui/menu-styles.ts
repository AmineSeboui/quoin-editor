import { TAP_TARGET_FLOOR } from './touch-target';

/** shadcn's entrance and exit for anything that pops over the canvas: a quick fade with a slight zoom, sliding in from
 *  the side it opens on. */
export const SURFACE_MOTION =
  'duration-100 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-[0.5rem] data-[side=left]:slide-in-from-right-[0.5rem] data-[side=right]:slide-in-from-left-[0.5rem] data-[side=top]:slide-in-from-bottom-[0.5rem]';

/** The panel every popover, menu and toolbar floats on. */
export const FLOATING_SURFACE =
  'quoin z-50 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10';

/** A row of buttons floating over the canvas, as the formatting toolbar and the toolbar of a selected image are. */
export const FLOATING_TOOLBAR = 'flex w-auto flex-row items-center gap-0.5 p-1';

/** The classes the dropdown menu and the context menu share, so the block menu reads the same opened either way. */
export const MENU_CONTENT = `${FLOATING_SURFACE} max-h-(--radix-popper-available-height) min-w-32 overflow-x-hidden overflow-y-auto p-1 ${SURFACE_MOTION}`;

export const MENU_SUB_CONTENT = `${FLOATING_SURFACE} max-h-(--radix-popper-available-height) min-w-[96px] overflow-x-hidden overflow-y-auto p-1 shadow-lg ${SURFACE_MOTION}`;

const ROW =
  'group/menu-item relative flex cursor-default items-center gap-1.5 rounded-md py-1 text-sm select-none focus:bg-accent focus:text-accent-foreground focus:outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const MENU_ITEM = [
  ROW,
  "px-1.5 data-[inset]:ps-7 [&_svg:not([class*='size-'])]:size-4",
  TAP_TARGET_FLOOR,
].join(' ');

export const MENU_CHECKABLE_ITEM = [ROW, 'pe-8 ps-1.5 data-[inset]:ps-7', TAP_TARGET_FLOOR].join(' ');

export const MENU_ITEM_INDICATOR = 'pointer-events-none absolute end-2 flex items-center justify-center';

export const MENU_SUB_TRIGGER = [
  ROW,
  "px-1.5 data-[inset]:ps-7 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg:not([class*='size-'])]:size-4",
  TAP_TARGET_FLOOR,
].join(' ');

export const MENU_LABEL = 'px-1.5 py-1 text-xs font-medium text-muted-foreground data-[inset]:ps-7';

export const MENU_SEPARATOR = 'bg-border -mx-1 my-1 h-px';

/** A row of a listbox that a combobox drives, as the slash menu's are: shadcn's command item. */
export const LIST_OPTION = [
  "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='size-'])]:size-4",
  TAP_TARGET_FLOOR,
].join(' ');

/** The heading of a group of such rows. */
export const LIST_GROUP_LABEL = 'px-2 py-1.5 text-xs font-medium text-muted-foreground';

export const MENU_SHORTCUT =
  'ms-auto text-xs tracking-widest text-muted-foreground group-focus/menu-item:text-accent-foreground';
