'use client';

import { useMemo, type KeyboardEvent } from 'react';
import type { EditorState } from '../../engine';
import type { ToolbarItem } from '../../extensions/ui-types';
import type { CanvasUiStore } from '../../canvas/ui-store';
import type { QuoinLabels } from '../../i18n/labels';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { keepFocus } from '../floating/keep-focus';
import { useSelectionAnchor } from '../floating/use-selection-anchor';
import { AlignDropdown } from './AlignDropdown';
import { bubbleItems, ToolbarButton } from './bubble-items';
import { ColorPopover } from './ColorPopover';
import { TurnIntoDropdown } from './TurnIntoDropdown';
import { useRovingFocus } from './use-roving-focus';
import { BUBBLE_PART } from './use-selection-settled';

const TOOLBAR = 'flex w-auto items-center gap-0.5 p-1 shadow-md';
const DIVIDER = 'mx-0.5 h-5 w-px shrink-0 bg-border';

const wholeState = (state: EditorState) => state;
const preventDefault = (event: Event) => event.preventDefault();

const isFocusKey = (event: globalThis.KeyboardEvent) =>
  event.key === 'F10' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

function useFocusKey(controller: ViewController, focus: () => void): void {
  useIsomorphicLayoutEffect(() => {
    const intercept = (event: globalThis.KeyboardEvent) => {
      if (!isFocusKey(event)) return false;
      event.preventDefault();
      focus();
      return true;
    };
    controller.keyInterceptors.add(intercept);
    return () => void controller.keyInterceptors.delete(intercept);
  }, [controller, focus]);
}

type BubbleToolbarProps = {
  controller: ViewController;
  labels: QuoinLabels;
  store: CanvasUiStore;
  extraItems: readonly ToolbarItem[];
};

/** The formatting toolbar over selected text. Alt+F10 moves into it; Escape and Tab go back to the text. */
export function BubbleToolbar({ controller, labels, store, extraItems }: BubbleToolbarProps) {
  const state = useEditorState(controller, wholeState);
  const { anchor, side } = useSelectionAnchor(controller, state);
  const roving = useRovingFocus();
  const items = useMemo(() => bubbleItems(labels, () => store.set({ linkPopover: { open: true } })), [labels, store]);
  useFocusKey(controller, roving.focusCurrent);

  const onKeyDown = (event: KeyboardEvent) => {
    if (!roving.owns(event.target)) return;
    if (event.key === 'Escape' || (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey)) {
      event.preventDefault();
      controller.focus();
    } else roving.onKeyDown(event);
  };
  const button = (item: ToolbarItem) => (
    <ToolbarButton key={item.id} item={item} state={state} controller={controller} />
  );

  return (
    <Popover open modal={false}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        ref={roving.ref}
        role="toolbar"
        aria-label={labels.formattingToolbar}
        side={side}
        className={TOOLBAR}
        onOpenAutoFocus={preventDefault}
        onCloseAutoFocus={preventDefault}
        onPointerDown={keepFocus}
        onMouseDown={keepFocus}
        onFocus={roving.onFocus}
        onKeyDown={onKeyDown}
        {...{ [BUBBLE_PART]: '' }}
      >
        <TurnIntoDropdown controller={controller} state={state} />
        <span aria-hidden="true" className={DIVIDER} />
        {items.inline.map(button)}
        <ColorPopover controller={controller} state={state} />
        <AlignDropdown controller={controller} state={state} />
        {items.scripts.map(button)}
        {extraItems.map(button)}
      </PopoverContent>
    </Popover>
  );
}
