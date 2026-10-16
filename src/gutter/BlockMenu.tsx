'use client';

import type { ReactElement } from 'react';
import { returnFocusToText } from '../blocks/text/return-focus-to-text';
import { useCanvasUi, type CanvasUiStore } from '../canvas/ui-store';
import { useLabels } from '../i18n/use-labels';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';
import type { ViewController } from '../view';
import type { BlockMenuAction } from './block-menu-items';
import { closeBlockMenu } from './block-menu-state';
import { BlockMenuItems } from './BlockMenuItems';
import { DROPDOWN_KIT } from './menu-kit';
import { useMenuBlocks } from './use-menu-blocks';

type BlockMenuProps = {
  controller: ViewController;
  store: CanvasUiStore;
  actions: readonly BlockMenuAction[];
  /** Opens the menu for the gutter's block. */
  onOpen(): void;
  /** The handle the menu hangs from. */
  children: ReactElement;
};

type BlockMenuContentProps = Pick<BlockMenuProps, 'controller' | 'store' | 'actions'> & { blockIds: string[] };

// Radix names the menu after its trigger, the handle, so the name the block gives it replaces that one.
function BlockMenuContent({ controller, store, actions, blockIds }: BlockMenuContentProps) {
  const labels = useLabels();
  const { blocks, title } = useMenuBlocks(controller, store, blockIds);
  if (blocks.length === 0) return null;
  return (
    <DropdownMenuContent
      align="start"
      aria-label={labels.blockMenu(title)}
      aria-labelledby={undefined}
      onCloseAutoFocus={returnFocusToText(controller)}
    >
      <BlockMenuItems kit={DROPDOWN_KIT} controller={controller} blocks={blocks} title={title} actions={actions} />
    </DropdownMenuContent>
  );
}

/** The block menu that hangs from the gutter's handle, opened by a click on it or by Mod+/ from the text. */
export function BlockMenu({ controller, store, actions, onOpen, children }: BlockMenuProps) {
  const menu = useCanvasUi(store, (state) => state.blockMenu);
  const open = menu?.anchor === 'handle';
  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        if (next) onOpen();
        else closeBlockMenu(store);
      }}
    >
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      {open && <BlockMenuContent controller={controller} store={store} actions={actions} blockIds={menu.blockIds} />}
    </DropdownMenu>
  );
}
