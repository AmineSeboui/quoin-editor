'use client';

import { useEffect, useRef } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { useCanvasUi, type CanvasUiStore } from '../canvas/ui-store';
import { DragOverlay, type DragOverlayHandle } from '../drag/DragOverlay';
import { useBlockDrag } from '../drag/use-block-drag';
import { useLabels } from '../i18n/use-labels';
import { keepFocus } from '../menus/floating/keep-focus';
import { Button } from '../ui/button';
import { cn } from '../ui/cn';
import { SQUARE_TAP_TARGET_FLOOR } from '../ui/touch-target';
import type { ViewController } from '../view';
import { addBlockBelow } from './add-block-below';
import type { BlockMenuAction } from './block-menu-items';
import { closeBlockMenu, openBlockMenu } from './block-menu-state';
import { BlockMenu } from './BlockMenu';
import { GUTTER_BLOCK } from './use-context-menu-opener';
import { useGutterPosition } from './use-gutter-position';
import { useGutterTarget } from './use-gutter-target';

// A touch screen shows the gutter only beside the block being edited, or the block whose menu is open, and only its
// handle, since the mobile toolbar adds blocks there.
const GUTTER = 'absolute top-0 left-0 z-10 flex items-center gap-0.5 pointer-coarse:not-data-current:hidden';
const ADD_BELOW = 'text-muted-foreground pointer-coarse:hidden';


type GutterProps = { controller: ViewController; store: CanvasUiStore; actions: readonly BlockMenuAction[] };

export function Gutter({ controller, store, actions }: GutterProps) {
  const labels = useLabels();
  const element = useRef<HTMLDivElement>(null);
  const overlay = useRef<DragOverlayHandle>(null);
  const menuOpenAtPress = useRef(false);
  const { target, focused } = useGutterTarget(controller, store, element);
  const menuOpen = useCanvasUi(store, (state) => state.blockMenu !== null);
  const drag = useBlockDrag(controller, store, target, overlay);
  useGutterPosition(controller, element, target);

  useEffect(() => () => closeBlockMenu(store), [store]);

  const openMenu = () => {
    const { state } = controller.editor;
    if (target !== null && state.doc.index.has(target)) openBlockMenu(store, state, target);
  };
  const addBelow = () => {
    if (target !== null) addBlockBelow(controller, target);
  };

  return (
    <>
      <div
        ref={element}
        className={cn(GUTTER, target === null && 'hidden')}
        data-current={focused || menuOpen ? '' : undefined}
        {...{ [GUTTER_BLOCK]: target ?? undefined }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          tabIndex={-1}
          aria-label={labels.addBelow}
          className={ADD_BELOW}
          onPointerDown={keepFocus}
          onClick={addBelow}
        >
          <Plus />
        </Button>
        <BlockMenu controller={controller} store={store} actions={actions} onOpen={openMenu}>
          <Button
            type="button"
            variant="ghost"
            size={null}
            tabIndex={-1}
            aria-label={labels.dragHandle}
            className={cn('text-muted-foreground h-6 w-4 cursor-grab rounded-md', SQUARE_TAP_TARGET_FLOOR)}
            onPointerDown={(event) => {
              // The press closes an open menu as a press outside it, before its click arrives, so that click must not
              // open the menu again.
              menuOpenAtPress.current = event.button === 0 && store.get().blockMenu?.anchor === 'handle';
              keepFocus(event);
              drag.onPointerDown(event);
            }}
            onClick={(event) => {
              // A click with no press of its own, from assistive technology or a script, has a detail of 0, and a press
              // that ended without a click leaves the flag behind.
              const closing = menuOpenAtPress.current && event.detail > 0;
              menuOpenAtPress.current = false;
              if (!drag.takeClick(event) && !closing) openMenu();
            }}
          >
            <GripVertical />
          </Button>
        </BlockMenu>
      </div>
      <DragOverlay ref={overlay} />
    </>
  );
}
