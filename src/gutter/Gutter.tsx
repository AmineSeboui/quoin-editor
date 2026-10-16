'use client';

import { useEffect, useRef, type PointerEvent } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { useCanvasUi, type CanvasUiStore } from '../canvas/ui-store';
import { DragOverlay, type DragOverlayHandle } from '../drag/DragOverlay';
import { useBlockDrag } from '../drag/use-block-drag';
import { useLabels } from '../i18n/use-labels';
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

// A touch screen shows the gutter only beside the block being edited, or the block whose menu is open.
const GUTTER = 'absolute top-0 left-0 z-10 flex items-center gap-0.5 pointer-coarse:not-data-current:hidden';

// A mouse press would move focus from the text to the control; the menu takes focus when it opens and gives it back on
// close. A touch moves no focus, and WebKit drops the click of a tap whose pointerdown was cancelled.
const keepFocus = (event: PointerEvent) => {
  if (event.pointerType !== 'touch') event.preventDefault();
};

type GutterProps = { controller: ViewController; store: CanvasUiStore; actions: readonly BlockMenuAction[] };

export function Gutter({ controller, store, actions }: GutterProps) {
  const labels = useLabels();
  const element = useRef<HTMLDivElement>(null);
  const overlay = useRef<DragOverlayHandle>(null);
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
    if (target !== null && addBlockBelow(controller, target)) store.set({ slashOpen: true });
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
          className="text-muted-foreground"
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
              keepFocus(event);
              drag.onPointerDown(event);
            }}
            onClick={(event) => {
              if (!drag.takeClick(event)) openMenu();
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
