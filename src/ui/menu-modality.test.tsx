import { fireEvent, render, screen } from '@testing-library/react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';

const outside = () => screen.getByRole('textbox', { name: 'Text around the menu' });

describe('an open menu', () => {
  it('as a dropdown, leaves the focusable content around it in the accessibility tree', () => {
    render(
      <>
        <div role="textbox" tabIndex={0} aria-label="Text around the menu" />
        <DropdownMenu open>
          <DropdownMenuTrigger>Options</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>,
    );
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
    expect(outside()).toBeInTheDocument();
  });

  it('as a context menu, leaves the focusable content around it in the accessibility tree', () => {
    render(
      <>
        <div role="textbox" tabIndex={0} aria-label="Text around the menu" />
        <ContextMenu>
          <ContextMenuTrigger>Block</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Duplicate</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </>,
    );
    fireEvent.contextMenu(screen.getByText('Block'));
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
    expect(outside()).toBeInTheDocument();
  });
});
