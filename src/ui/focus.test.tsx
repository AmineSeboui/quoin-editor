import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from './context-menu';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { FilePickerButton } from '../upload/FilePickerButton';

const SOURCES = import.meta.glob<string>('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });

const RING_CLASSES = [
  'focus-visible:outline-2',
  'focus-visible:outline-offset-2',
  'focus-visible:outline-solid',
  'focus-visible:outline-[var(--quoin-ring)]',
];

const BAR = 'shadow-[inset_2px_0_0_var(--quoin-foreground)]';

/** Unconditional, this utility draws a 2px outline round every control at rest in forced-colors mode, so the one with
 *  focus no longer stands out. Scoped to :focus it frames only the focused control. */
const FORCED_COLORS_FRAME = 'outline-hidden';

function classesOf(el: Element | null): string[] {
  if (!el) throw new Error('element not rendered');
  return el.className.split(/\s+/);
}

function expectHighlightedRows(rows: HTMLElement[]) {
  for (const row of rows) {
    expect(classesOf(row)).toContain(`data-[highlighted]:${BAR}`);
    expect(classesOf(row)).toContain(`focus:${FORCED_COLORS_FRAME}`);
    expect(classesOf(row)).not.toContain(FORCED_COLORS_FRAME);
  }
}

function expectFocusRing(el: Element | null) {
  const classes = classesOf(el);
  expect(classes).toEqual(expect.arrayContaining(RING_CLASSES));
  expect(classes).not.toContain('outline-none');
  expect(classes).not.toContain(FORCED_COLORS_FRAME);
  expect(classes.some((c) => c.includes('ring-ring'))).toBe(false);
}

describe('keyboard focus is a solid outline', () => {
  it('on a button', () => {
    render(<Button>Save</Button>);
    expectFocusRing(screen.getByRole('button', { name: 'Save' }));
  });

  it('on an input', () => {
    render(<Input aria-label="Name" />);
    expectFocusRing(screen.getByLabelText('Name'));
  });

  it('on a textarea', () => {
    render(<Textarea aria-label="Notes" />);
    expectFocusRing(screen.getByLabelText('Notes'));
  });

  it('on the dialog close button', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expectFocusRing(screen.getByRole('button', { name: 'Close' }));
  });

  it('around the file picker, which paints it on a wrapper because the input is invisible', () => {
    render(<FilePickerButton label="Upload file" onPick={() => {}} />);
    const wrapper = screen.getByLabelText('Upload file').parentElement;
    const classes = classesOf(wrapper);
    expect(classes).toEqual(
      expect.arrayContaining([
        'has-[:focus-visible]:outline-2',
        'has-[:focus-visible]:outline-offset-2',
        'has-[:focus-visible]:outline-[var(--quoin-ring)]',
      ]),
    );
    expect(classes.some((c) => c.includes('ring-ring'))).toBe(false);
  });
});

describe('a highlighted row carries a bar as well as a background', () => {
  it('in a menu', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
          <DropdownMenuCheckboxItem checked>Checkbox</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">Radio</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Sub</DropdownMenuSubTrigger>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const rows = [
      screen.getByRole('menuitem', { name: 'Item' }),
      screen.getByRole('menuitemcheckbox', { name: 'Checkbox' }),
      screen.getByRole('menuitemradio', { name: 'Radio' }),
      screen.getByRole('menuitem', { name: 'Sub' }),
    ];
    expectHighlightedRows(rows);
  });

  it('in a context menu', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Item</ContextMenuItem>
          <ContextMenuCheckboxItem checked>Checkbox</ContextMenuCheckboxItem>
          <ContextMenuRadioGroup value="a">
            <ContextMenuRadioItem value="a">Radio</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Sub</ContextMenuSubTrigger>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText('Area'));
    expectHighlightedRows([
      screen.getByRole('menuitem', { name: 'Item' }),
      screen.getByRole('menuitemcheckbox', { name: 'Checkbox' }),
      screen.getByRole('menuitemradio', { name: 'Radio' }),
      screen.getByRole('menuitem', { name: 'Sub' }),
    ]);
  });
});

describe('forced-colors mode', () => {
  it('frames a popover only while it holds focus', () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>,
    );
    const classes = classesOf(document.querySelector('[data-slot="popover-content"]'));
    expect(classes).toContain(`focus:${FORCED_COLORS_FRAME}`);
    expect(classes).not.toContain(FORCED_COLORS_FRAME);
  });
});

describe('the component sources', () => {
  it('neither hide focus with outline-none nor draw it as a translucent ring', () => {
    const offenders = Object.entries(SOURCES)
      .filter(([path]) => !/\.test\.tsx?$/.test(path))
      .filter(([, source]) => /outline-none|ring-ring/.test(source))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it('are found by the scan above', () => {
    expect(Object.keys(SOURCES).some((path) => path.endsWith('/button.tsx'))).toBe(true);
  });
});
