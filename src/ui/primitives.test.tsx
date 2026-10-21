import type { ReactElement, RefCallback } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './button';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';

// React 18 hands a ref to a function component only through forwardRef. A plain function drops it, which loses
// focus return, menu anchoring and the drag handle, while React 19 tests would still pass on ref-as-prop.
const FORWARD_REF = Symbol.for('react.forward_ref');

type Capture = RefCallback<HTMLElement>;
type Refs<Part extends string> = Partial<Record<Part, Capture>>;
type Case = [name: string, component: unknown, draw: (ref: Capture) => ReactElement];

const dialog = (refs: Refs<'trigger' | 'close' | 'content' | 'title' | 'description'> = {}) => (
  <Dialog open>
    <DialogTrigger ref={refs.trigger}>Open</DialogTrigger>
    <DialogContent ref={refs.content}>
      <DialogTitle ref={refs.title}>Title</DialogTitle>
      <DialogDescription ref={refs.description}>Body</DialogDescription>
      <DialogClose ref={refs.close}>Done</DialogClose>
    </DialogContent>
  </Dialog>
);

const popover = (refs: Refs<'trigger' | 'anchor' | 'content'> = {}) => (
  <Popover open>
    <PopoverAnchor ref={refs.anchor} />
    <PopoverTrigger ref={refs.trigger}>Open</PopoverTrigger>
    <PopoverContent ref={refs.content}>Body</PopoverContent>
  </Popover>
);

type MenuParts = 'trigger' | 'content' | 'group' | 'item' | 'checkbox' | 'radioGroup' | 'radio' | 'label' | 'separator';
type SubParts = 'subTrigger' | 'subContent';

const dropdown = (refs: Refs<MenuParts | SubParts> = {}) => (
  <DropdownMenu open>
    <DropdownMenuTrigger ref={refs.trigger}>Open</DropdownMenuTrigger>
    <DropdownMenuContent ref={refs.content}>
      <DropdownMenuLabel ref={refs.label}>Label</DropdownMenuLabel>
      <DropdownMenuSeparator ref={refs.separator} />
      <DropdownMenuGroup ref={refs.group}>
        <DropdownMenuItem ref={refs.item}>Item</DropdownMenuItem>
        <DropdownMenuCheckboxItem ref={refs.checkbox}>Check</DropdownMenuCheckboxItem>
      </DropdownMenuGroup>
      <DropdownMenuRadioGroup ref={refs.radioGroup} value="a">
        <DropdownMenuRadioItem ref={refs.radio} value="a">Radio</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSub open>
        <DropdownMenuSubTrigger ref={refs.subTrigger}>More</DropdownMenuSubTrigger>
        <DropdownMenuSubContent ref={refs.subContent}>
          <DropdownMenuItem>Inner</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>
);

const contextMenu = (refs: Refs<MenuParts | SubParts> = {}) => (
  <ContextMenu>
    <ContextMenuTrigger ref={refs.trigger}>Area</ContextMenuTrigger>
    <ContextMenuContent ref={refs.content}>
      <ContextMenuLabel ref={refs.label}>Label</ContextMenuLabel>
      <ContextMenuSeparator ref={refs.separator} />
      <ContextMenuGroup ref={refs.group}>
        <ContextMenuItem ref={refs.item}>Item</ContextMenuItem>
        <ContextMenuCheckboxItem ref={refs.checkbox}>Check</ContextMenuCheckboxItem>
      </ContextMenuGroup>
      <ContextMenuRadioGroup ref={refs.radioGroup} value="a">
        <ContextMenuRadioItem ref={refs.radio} value="a">Radio</ContextMenuRadioItem>
      </ContextMenuRadioGroup>
      <ContextMenuSub open>
        <ContextMenuSubTrigger ref={refs.subTrigger}>More</ContextMenuSubTrigger>
        <ContextMenuSubContent ref={refs.subContent}>
          <ContextMenuItem>Inner</ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  </ContextMenu>
);

const cases: Case[] = [
  ['Button', Button, (ref) => <Button ref={ref}>Save</Button>],
  ['Input', Input, (ref) => <Input ref={ref} aria-label="Name" />],

  ['DialogTrigger', DialogTrigger, (ref) => dialog({ trigger: ref })],
  ['DialogClose', DialogClose, (ref) => dialog({ close: ref })],
  ['DialogContent', DialogContent, (ref) => dialog({ content: ref })],
  ['DialogTitle', DialogTitle, (ref) => dialog({ title: ref })],
  ['DialogDescription', DialogDescription, (ref) => dialog({ description: ref })],
  ['DialogHeader', DialogHeader, (ref) => <DialogHeader ref={ref} />],
  ['DialogFooter', DialogFooter, (ref) => <DialogFooter ref={ref} />],
  [
    'DialogOverlay',
    DialogOverlay,
    (ref) => (
      <Dialog open>
        <DialogPortal>
          <DialogOverlay ref={ref} />
        </DialogPortal>
      </Dialog>
    ),
  ],

  ['PopoverTrigger', PopoverTrigger, (ref) => popover({ trigger: ref })],
  ['PopoverAnchor', PopoverAnchor, (ref) => popover({ anchor: ref })],
  ['PopoverContent', PopoverContent, (ref) => popover({ content: ref })],

  ['DropdownMenuTrigger', DropdownMenuTrigger, (ref) => dropdown({ trigger: ref })],
  ['DropdownMenuContent', DropdownMenuContent, (ref) => dropdown({ content: ref })],
  ['DropdownMenuGroup', DropdownMenuGroup, (ref) => dropdown({ group: ref })],
  ['DropdownMenuItem', DropdownMenuItem, (ref) => dropdown({ item: ref })],
  ['DropdownMenuCheckboxItem', DropdownMenuCheckboxItem, (ref) => dropdown({ checkbox: ref })],
  ['DropdownMenuRadioGroup', DropdownMenuRadioGroup, (ref) => dropdown({ radioGroup: ref })],
  ['DropdownMenuRadioItem', DropdownMenuRadioItem, (ref) => dropdown({ radio: ref })],
  ['DropdownMenuLabel', DropdownMenuLabel, (ref) => dropdown({ label: ref })],
  ['DropdownMenuSeparator', DropdownMenuSeparator, (ref) => dropdown({ separator: ref })],
  ['DropdownMenuShortcut', DropdownMenuShortcut, (ref) => <DropdownMenuShortcut ref={ref}>K</DropdownMenuShortcut>],
  ['DropdownMenuSubTrigger', DropdownMenuSubTrigger, (ref) => dropdown({ subTrigger: ref })],
  ['DropdownMenuSubContent', DropdownMenuSubContent, (ref) => dropdown({ subContent: ref })],

  ['ContextMenuTrigger', ContextMenuTrigger, (ref) => contextMenu({ trigger: ref })],
  ['ContextMenuContent', ContextMenuContent, (ref) => contextMenu({ content: ref })],
  ['ContextMenuGroup', ContextMenuGroup, (ref) => contextMenu({ group: ref })],
  ['ContextMenuItem', ContextMenuItem, (ref) => contextMenu({ item: ref })],
  ['ContextMenuCheckboxItem', ContextMenuCheckboxItem, (ref) => contextMenu({ checkbox: ref })],
  ['ContextMenuRadioGroup', ContextMenuRadioGroup, (ref) => contextMenu({ radioGroup: ref })],
  ['ContextMenuRadioItem', ContextMenuRadioItem, (ref) => contextMenu({ radio: ref })],
  ['ContextMenuLabel', ContextMenuLabel, (ref) => contextMenu({ label: ref })],
  ['ContextMenuSeparator', ContextMenuSeparator, (ref) => contextMenu({ separator: ref })],
  ['ContextMenuShortcut', ContextMenuShortcut, (ref) => <ContextMenuShortcut ref={ref}>K</ContextMenuShortcut>],
  ['ContextMenuSubTrigger', ContextMenuSubTrigger, (ref) => contextMenu({ subTrigger: ref })],
  ['ContextMenuSubContent', ContextMenuSubContent, (ref) => contextMenu({ subContent: ref })],
];

const slotOf = (name: string) => name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

function openContextMenu() {
  const trigger = document.querySelector('[data-slot="context-menu-trigger"]');
  if (trigger) fireEvent.contextMenu(trigger);
}

describe('a primitive given a ref', () => {
  it.each(cases)('%s forwards it to its element on every React major', (name, component, draw) => {
    let received: HTMLElement | null = null;
    render(
      draw((node) => {
        if (node) received = node;
      }),
    );
    openContextMenu();

    expect((component as { $$typeof?: symbol }).$$typeof).toBe(FORWARD_REF);
    expect(received).toBeInstanceOf(HTMLElement);
    expect(received).toBe(document.querySelector(`[data-slot="${slotOf(name)}"]`));
  });
});

describe('the dialog close button', () => {
  const dialogClosedBy = (closeLabel?: string) => (
    <Dialog open>
      <DialogContent closeLabel={closeLabel}>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Body</DialogDescription>
      </DialogContent>
    </Dialog>
  );

  it('is named Close in English', () => {
    render(dialogClosedBy());
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('is named by the label the caller gives', () => {
    render(dialogClosedBy('Fermer'));
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});
