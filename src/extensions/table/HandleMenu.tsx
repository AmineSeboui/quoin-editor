'use client';

import { Fragment, type CSSProperties, type ReactNode, type Ref } from 'react';
import { GripHorizontal, GripVertical } from 'lucide-react';
import { returnFocusToText } from '../../blocks/text/return-focus-to-text';
import { MenuIcon } from '../../gutter/MenuIcon';
import { bubblePart } from '../../menus/bubble/bubble-part';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import type { ViewController } from '../../view';
import type { TableMenuItem } from './table-menu-items';

const DESTRUCTIVE = 'text-destructive focus:text-destructive';

type HandleMenuProps = {
  controller: ViewController;
  axis: 'row' | 'column';
  label: string;
  style: CSSProperties;
  items: readonly TableMenuItem[];
  open: boolean;
  onOpenChange(open: boolean): void;
  buttonRef?: Ref<HTMLButtonElement>;
  /** Drawn in the menu after the items that insert and move, before the one that deletes. */
  children?: ReactNode;
};

/** The handle of a row or a column, and the menu it opens. */
export function HandleMenu({ controller, axis, label, style, items, open, onOpenChange, buttonRef, children }: HandleMenuProps) {
  const run = (item: TableMenuItem) => {
    if (controller.run(item.command)) controller.announce(item.done);
  };
  const item = (entry: TableMenuItem) => (
    <DropdownMenuItem
      key={entry.id}
      disabled={entry.disabled}
      className={entry.destructive ? DESTRUCTIVE : undefined}
      onSelect={() => run(entry)}
    >
      <MenuIcon icon={entry.icon} />
      {entry.label}
    </DropdownMenuItem>
  );
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          ref={buttonRef}
          type="button"
          tabIndex={-1}
          aria-label={label}
          data-axis={axis}
          className="quoin-table-handle"
          style={style}
        >
          {axis === 'row' ? <GripVertical aria-hidden="true" /> : <GripHorizontal aria-hidden="true" />}
        </button>
      </DropdownMenuTrigger>
      {open && (
        <DropdownMenuContent
          align="start"
          aria-label={label}
          aria-labelledby={undefined}
          onCloseAutoFocus={returnFocusToText(controller)}
          {...bubblePart(controller)}
        >
          {items.filter((entry) => !entry.destructive).map(item)}
          {children}
          {items.filter((entry) => entry.destructive).map((entry) => (
            <Fragment key={entry.id}>
              <DropdownMenuSeparator />
              {item(entry)}
            </Fragment>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
