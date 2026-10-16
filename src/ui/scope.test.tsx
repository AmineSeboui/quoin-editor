import { fireEvent, render, screen } from '@testing-library/react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './context-menu';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const portalled = (slot: string) => document.body.querySelector(`[data-slot="${slot}"]`);

describe('the quoin scope class on content portalled out of the editor', () => {
  it('is on a menu', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole('menu')).toHaveClass('quoin');
  });

  it('is on a context menu', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Item</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText('Area'));
    expect(screen.getByRole('menu')).toHaveClass('quoin');
  });

  it('is on a popover', () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>,
    );
    expect(portalled('popover-content')).toHaveClass('quoin');
  });

  it('is on the dialog overlay and content', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(portalled('dialog-overlay')).toHaveClass('quoin');
    expect(portalled('dialog-content')).toHaveClass('quoin');
  });
});
