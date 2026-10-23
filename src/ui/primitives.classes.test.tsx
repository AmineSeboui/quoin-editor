import type { ReactElement } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Button } from './button';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from './context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from './dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import { Popover, PopoverAnchor, PopoverContent } from './popover';
import { classLists } from './test-class-lists';

const VARIANTS = ['default', 'outline', 'ghost'] as const;
const SIZES = ['default', 'xs', 'sm', 'icon-xs', 'icon-sm', null] as const;
const HOST = 'host-class';

type Family = [name: string, draw: (className?: string) => ReactElement];

const buttons = (className?: string) => (
  <>
    {VARIANTS.flatMap((variant) =>
      SIZES.map((size) => (
        <Button
          key={`${variant} ${size}`}
          variant={variant}
          size={size}
          aria-label={`${variant} ${size ?? 'unsized'}`}
          className={className}
        />
      )),
    )}
  </>
);

const dialog = (className?: string) => (
  <Dialog open>
    <DialogPortal>
      <DialogOverlay className={className} />
    </DialogPortal>
    <DialogContent className={className}>
      <DialogHeader className={className}>
        <DialogTitle className={className}>Title</DialogTitle>
        <DialogDescription className={className}>Body</DialogDescription>
      </DialogHeader>
      <DialogFooter className={className} />
    </DialogContent>
  </Dialog>
);

const dropdown = (className?: string) => (
  <DropdownMenu open>
    <DropdownMenuTrigger>Open</DropdownMenuTrigger>
    <DropdownMenuContent className={className}>
      <DropdownMenuLabel className={className}>Label</DropdownMenuLabel>
      <DropdownMenuSeparator className={className} />
      <DropdownMenuItem className={className}>
        Item <DropdownMenuShortcut className={className}>K</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuCheckboxItem className={className}>Check</DropdownMenuCheckboxItem>
      <DropdownMenuRadioGroup value="a">
        <DropdownMenuRadioItem className={className} value="a">
          Radio
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSub open>
        <DropdownMenuSubTrigger className={className}>More</DropdownMenuSubTrigger>
        <DropdownMenuSubContent className={className}>
          <DropdownMenuItem>Inner</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>
);

const contextMenu = (className?: string) => (
  <ContextMenu>
    <ContextMenuTrigger>Area</ContextMenuTrigger>
    <ContextMenuContent className={className}>
      <ContextMenuLabel className={className}>Label</ContextMenuLabel>
      <ContextMenuSeparator className={className} />
      <ContextMenuItem className={className}>
        Item <ContextMenuShortcut className={className}>K</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuCheckboxItem className={className}>Check</ContextMenuCheckboxItem>
      <ContextMenuRadioGroup value="a">
        <ContextMenuRadioItem className={className} value="a">
          Radio
        </ContextMenuRadioItem>
      </ContextMenuRadioGroup>
      <ContextMenuSub open>
        <ContextMenuSubTrigger className={className}>More</ContextMenuSubTrigger>
        <ContextMenuSubContent className={className}>
          <ContextMenuItem>Inner</ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  </ContextMenu>
);

const families: Family[] = [
  ['button', buttons],
  [
    'field',
    (className) => <Input aria-label="Name" className={className} />,
  ],
  [
    'popover',
    (className) => (
      <Popover open>
        <PopoverAnchor />
        <PopoverContent className={className}>Body</PopoverContent>
      </Popover>
    ),
  ],
  ['dialog', dialog],
  ['dropdown menu', dropdown],
  ['context menu', contextMenu],
];

function draw(element: ReactElement): string[] {
  render(element);
  const trigger = document.querySelector('[data-slot="context-menu-trigger"]');
  if (trigger) fireEvent.contextMenu(trigger);
  return classLists(document.body);
}

describe('the classes of a primitive', () => {
  it.each(families)('in the %s family are those its variants give it', (_, family) => {
    expect(draw(family())).toMatchSnapshot();
  });

  it.each(families)('in the %s family keep a class the host adds', (_, family) => {
    const lists = draw(family(HOST));
    expect(lists.join(' ').split(' ')).toContain(HOST);
    expect(lists).toMatchSnapshot();
  });
});
