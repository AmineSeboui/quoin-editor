'use client';

import { useDirection } from '@radix-ui/react-direction';
import { useMemo, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useCanvasUiStore } from '../canvas/ui-store';
import type { ToolbarItem } from '../extensions/ui-types';
import { useLabels } from '../i18n/use-labels';
import { ToolbarButton } from '../toolbar/toolbar-button';
import { TurnIntoDropdown } from '../toolbar/TurnIntoDropdown';
import { useRovingFocus } from '../toolbar/use-roving-focus';
import { bubblePart } from '../toolbar/bubble-part';
import { useFocusBackToText } from '../toolbar/use-focus-back-to-text';
import { keepFocus } from '../menus/floating/keep-focus';
import { useFocusKey } from '../menus/floating/use-focus-key';
import type { ViewController } from '../view';
import { useEditorState, wholeState } from '../view/react/use-editor-state';
import { mobileItems } from './mobile-items';
import { useCoarsePointer } from './use-coarse-pointer';
import { useEditorFocus } from './use-editor-focus';
import { useVisualViewport, type VisualViewportBox } from './use-visual-viewport';

const TOOLBAR = [
  'quoin bg-popover text-popover-foreground fixed inset-x-0 z-40 flex items-center gap-0.5 overflow-x-auto',
  'border-t p-1 shadow-md',
].join(' ');

// A fixed element is placed against the layout viewport, which a virtual keyboard leaves whole, so the bar follows the
// bottom edge of the visual viewport instead. Under a pinch zoom the bar is laid out at the width the zoom would give
// it and scaled back by as much, so it spans the visible part of the page at its own size.
function placement(viewport: VisualViewportBox | null): CSSProperties {
  if (viewport === null) return { bottom: 0 };
  const { offsetLeft, offsetTop, height, width, scale } = viewport;
  const shift = 'translateY(-100%)';
  return {
    top: offsetTop + height,
    left: offsetLeft,
    right: 'auto',
    width: width * scale,
    transform: scale === 1 ? shift : `scale(${1 / scale}) ${shift}`,
    transformOrigin: '0 0',
  };
}

type MobileToolbarProps = { controller: ViewController };

function EditingTools({ controller }: MobileToolbarProps) {
  const labels = useLabels();
  const store = useCanvasUiStore();
  const state = useEditorState(controller, wholeState);
  const viewport = useVisualViewport();
  const roving = useRovingFocus();
  const dir = useDirection();
  useFocusBackToText(controller);
  useFocusKey(controller, roving.focusCurrent);
  const items = useMemo(() => mobileItems(labels, () => store.set({ linkPopover: { open: true } })), [labels, store]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && roving.owns(event.target)) {
      event.preventDefault();
      controller.focus();
    } else roving.onKeyDown(event);
  };
  const button = (item: ToolbarItem) => (
    <ToolbarButton key={item.id} item={item} state={state} controller={controller} />
  );

  return createPortal(
    <div
      ref={roving.ref}
      dir={dir}
      role="toolbar"
      aria-label={labels.mobileToolbar}
      className={TOOLBAR}
      style={placement(viewport)}
      onPointerDown={keepFocus}
      onMouseDown={keepFocus}
      onFocus={roving.onFocus}
      onKeyDown={onKeyDown}
      {...bubblePart(controller)}
    >
      {button(items.addBlock)}
      <TurnIntoDropdown controller={controller} state={state} />
      {items.editing.map(button)}
    </div>,
    document.body,
  );
}

/**
 * On a touch screen, the tools that format and edit the text, held above the virtual keyboard while it has focus. A
 * hardware keyboard reaches them with Alt+F10, as it does the bubble toolbar, and Escape goes back to the text.
 */
export function MobileToolbar({ controller }: MobileToolbarProps) {
  const coarse = useCoarsePointer();
  const focused = useEditorFocus(controller);
  if (!coarse || !focused) return null;
  return <EditingTools controller={controller} />;
}
