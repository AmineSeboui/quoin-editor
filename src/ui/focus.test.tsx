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
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { FOCUS_RING_BORDERLESS } from './focus';

const SRC = resolve(__dirname, '..');

const STYLED_FILES = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .filter((path) => /\.(tsx?|css)$/.test(path) && !/\.test\.tsx?$/.test(path))
  .map((path) => ({ path, source: readFileSync(join(SRC, path), 'utf8') }));

const RING_CLASSES = ['outline-none', 'focus-visible:border-ring', 'focus-visible:ring-3', 'focus-visible:ring-ring/50'];

/** Outlines that mark a selection or the current find match rather than focus. */
const SELECTION_OUTLINES = ['extensions/atoms/selected-atom.css', 'extensions/find/find.css'];

const OLD_FOCUS_OUTLINE = /outline-\[var\(--quoin-ring\)\]|outline:\s*2px solid var\(--quoin-ring\)/;

/** Unconditional, this utility draws a 2px outline round every control at rest in forced-colors mode, so the one with
 *  focus no longer stands out. Scoped to :focus it frames only the focused control. */
const FORCED_COLORS_FRAME = 'outline-hidden';
const BORDERLESS_EDGE = ['focus-visible:inset-ring-1', 'focus-visible:inset-ring-ring'];

function classesOf(el: Element | null): string[] {
  if (!el) throw new Error('element not rendered');
  return el.className.split(/\s+/);
}

function expectHighlightedRows(rows: HTMLElement[]) {
  for (const row of rows) {
    expect(classesOf(row)).toContain('focus:bg-accent');
    expect(classesOf(row).some((c) => c.includes('inset_2px'))).toBe(false);
    expect(classesOf(row)).toContain(`focus:${FORCED_COLORS_FRAME}`);
    expect(classesOf(row)).not.toContain(FORCED_COLORS_FRAME);
  }
}

function expectFocusRing(el: Element | null) {
  const classes = classesOf(el);
  expect(classes).toEqual(expect.arrayContaining(RING_CLASSES));
  expect(classes).not.toContain('focus-visible:outline-2');
}

describe("keyboard focus is shadcn's ring", () => {
  it('on a button', () => {
    render(<Button>Save</Button>);
    expectFocusRing(screen.getByRole('button', { name: 'Save' }));
  });

  it('on an input', () => {
    render(<Input aria-label="Name" />);
    expectFocusRing(screen.getByLabelText('Name'));
  });

  it('on a textarea', () => {
    render(<Textarea aria-label="Note" />);
    expectFocusRing(screen.getByLabelText('Note'));
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

  it('with a full-strength edge drawn inside it on a control that has no border to colour', () => {
    expect(FOCUS_RING_BORDERLESS.split(' ')).toEqual(expect.arrayContaining([...RING_CLASSES, ...BORDERLESS_EDGE]));
  });

  it('around the file picker, which paints it on a wrapper because the input is invisible', () => {
    render(<FilePickerButton label="Upload file" onPick={() => {}} />);
    const wrapper = screen.getByLabelText('Upload file').parentElement;
    const classes = classesOf(wrapper);
    expect(classes).toEqual(
      expect.arrayContaining([
        'has-[:focus-visible]:border-ring',
        'has-[:focus-visible]:ring-3',
        'has-[:focus-visible]:ring-ring/50',
        `has-[:focus-visible]:${FORCED_COLORS_FRAME}`,
        'has-[:focus-visible]:inset-ring-1',
        'has-[:focus-visible]:inset-ring-ring',
      ]),
    );
    expect(classes).not.toContain(FORCED_COLORS_FRAME);
    expect(classes.some((c) => c.includes('outline-[var(--quoin-ring)]'))).toBe(false);
  });
});

describe('under forced colours', () => {
  it('frames every focused element inside the editor in a system colour, fields and checkboxes included', () => {
    const styles = readFileSync(join(SRC, 'styles.css'), 'utf8');
    const forced = styles.slice(styles.indexOf('@media (forced-colors: active)'));
    expect(forced).toMatch(/\.quoin:focus-visible,\s*\.quoin :focus-visible \{\s*outline: 2px solid CanvasText !important;/);
  });
});

describe('a highlighted row is a background tint', () => {
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
  it('draw no focus as the old solid outline', () => {
    const offenders = STYLED_FILES.filter(({ path }) => !SELECTION_OUTLINES.includes(path))
      .filter(({ source }) => OLD_FOCUS_OUTLINE.test(source))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('are found by the scan above', () => {
    const paths = STYLED_FILES.map(({ path }) => path);
    expect(paths).toContain('ui/button.tsx');
    expect(paths).toContain('extensions/toc/toc-block.css');
  });
});
