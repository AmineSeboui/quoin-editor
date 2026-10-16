'use client';

import type { ReactElement } from 'react';
import { returnFocusToText } from '../blocks/text/return-focus-to-text';
import { useCanvasUi, type BlockMenuState, type CanvasUiStore } from '../canvas/ui-store';
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
  onOpen(): void;
  children: ReactElement;
};

type BlockMenuContentProps = Pick<BlockMenuProps, 'controller' | 'store' | 'actions'> & { menu: BlockMenuState };

// Radix names the menu after its trigger, the handle, so the name the block gives it replaces that one.
function BlockMenuContent({ controller, store, actions, menu }: BlockMenuContentProps) {
  const labels = useLabels();
  const { blocks, styled, title } = useMenuBlocks(controller, store, menu);
  if (blocks.length === 0) return null;
  return (
    <DropdownMenuContent
      align="start"
      aria-label={labels.blockMenu(title)}
      aria-labelledby={undefined}
      onCloseAutoFocus={returnFocusToText(controller)}
    >
      <BlockMenuItems
        kit={DROPDOWN_KIT}
        controller={controller}
        blocks={blocks}
        styled={styled}
        title={title}
        actions={actions}
      />
    </DropdownMenuContent>
  );
}

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
      {open && <BlockMenuContent controller={controller} store={store} actions={actions} menu={menu} />}
    </DropdownMenu>
  );
}
