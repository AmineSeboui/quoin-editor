'use client';

import { useRef } from 'react';
import { returnFocusToText } from '../blocks/text/return-focus-to-text';
import { useCanvasUi, type CanvasUiStore } from '../canvas/ui-store';
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

function BlockContextMenuContent({ controller, store, actions, blockIds }: BlockContextMenuProps & { blockIds: string[] }) {
  const labels = useLabels();
  const { blocks, title } = useMenuBlocks(controller, store, blockIds);
  if (blocks.length === 0) return null;
  return (
    <ContextMenuContent aria-label={labels.blockMenu(title)} onCloseAutoFocus={returnFocusToText(controller)}>
      <BlockMenuItems kit={CONTEXT_KIT} controller={controller} blocks={blocks} title={title} actions={actions} />
    </ContextMenuContent>
  );
}

/** The block menu's items at the pointer, for a right-click on the gutter, a block with no text or selected blocks. */
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
      {open && <BlockContextMenuContent controller={controller} store={store} actions={actions} blockIds={menu.blockIds} />}
    </ContextMenu>
  );
}
