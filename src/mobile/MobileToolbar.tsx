'use client';

import { useMemo, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useCanvasUiStore } from '../canvas/ui-store';
import type { ToolbarItem } from '../extensions/ui-types';
import { useLabels } from '../i18n/use-labels';
import { ToolbarButton } from '../menus/bubble/bubble-items';
import { TurnIntoDropdown } from '../menus/bubble/TurnIntoDropdown';
import { useRovingFocus } from '../menus/bubble/use-roving-focus';
import { bubblePart } from '../menus/bubble/bubble-part';
import { keepFocus } from '../menus/floating/keep-focus';
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
// bottom edge of the visual viewport instead.
function placement(viewport: VisualViewportBox | null): CSSProperties {
  if (viewport === null) return { bottom: 0 };
  return { top: viewport.offsetTop + viewport.height, width: viewport.width, transform: 'translateY(-100%)' };
}

type MobileToolbarProps = { controller: ViewController };

function EditingTools({ controller }: MobileToolbarProps) {
  const labels = useLabels();
  const store = useCanvasUiStore();
  const state = useEditorState(controller, wholeState);
  const viewport = useVisualViewport();
  const roving = useRovingFocus();
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

/** On a touch screen, the tools that format and edit the text, held above the virtual keyboard while it has focus. */
export function MobileToolbar({ controller }: MobileToolbarProps) {
  const coarse = useCoarsePointer();
  const focused = useEditorFocus(controller);
  if (!coarse || !focused) return null;
  return <EditingTools controller={controller} />;
}
