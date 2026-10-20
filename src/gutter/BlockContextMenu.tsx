'use client';

import { useRef } from 'react';
import { returnFocusToText } from '../blocks/text/return-focus-to-text';
import { useCanvasUi, type BlockMenuState, type CanvasUiStore } from '../canvas/ui-store';
import { useLabels } from '../i18n/use-labels';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '../ui/context-menu';
import type { ViewController } from '../view';
import type { BlockMenuAction } from './block-menu-items';
import { closeBlockMenu } from './block-menu-state';
import { BlockMenuItems } from './BlockMenuItems';
import { CONTEXT_KIT } from './menu-kit';
import { useContextMenuOpener } from './use-context-menu-opener';
import { useMenuBlocks } from './use-menu-blocks';

type BlockContextMenuProps = { controller: ViewController; store: CanvasUiStore; actions: readonly BlockMenuAction[] };

function BlockContextMenuContent({ controller, store, actions, menu }: BlockContextMenuProps & { menu: BlockMenuState }) {
  const labels = useLabels();
  const { blocks, styled, title } = useMenuBlocks(controller, store, menu);
  if (blocks.length === 0) return null;
  return (
    <ContextMenuContent aria-label={labels.blockMenu(title)} onCloseAutoFocus={returnFocusToText(controller)}>
      <BlockMenuItems
        kit={CONTEXT_KIT}
        controller={controller}
        blocks={blocks}
        styled={styled}
        title={title}
        actions={actions}
      />
    </ContextMenuContent>
  );
}

export function BlockContextMenu({ controller, store, actions }: BlockContextMenuProps) {
  const trigger = useRef<HTMLSpanElement>(null);
  const menu = useCanvasUi(store, (state) => state.blockMenu);
  const open = menu?.anchor === 'pointer';
  useContextMenuOpener(controller, store, trigger);
  return (
    <ContextMenu
      open={open}
      onOpenChange={(next) => {
        if (!next) closeBlockMenu(store);
      }}
    >
      <ContextMenuTrigger ref={trigger} hidden />
      {open && <BlockContextMenuContent controller={controller} store={store} actions={actions} menu={menu} />}
    </ContextMenu>
  );
}
