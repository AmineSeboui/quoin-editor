'use client';

import { useMemo, type KeyboardEvent } from 'react';
import type { ToolbarItem } from '../../extensions/ui-types';
import type { CanvasUiStore } from '../../canvas/ui-store';
import type { QuoinLabels } from '../../i18n/labels';
import { FLOATING_TOOLBAR } from '../../ui/menu-styles';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { preventDefault } from '../../ui/prevent-default';
import type { ViewController } from '../../view';
import { useEditorState, wholeState } from '../../view/react/use-editor-state';
import { keepFocus } from '../floating/keep-focus';
import { useFocusKey } from '../floating/use-focus-key';
import { useSelectionAnchor } from '../floating/use-selection-anchor';
import { AlignDropdown } from './AlignDropdown';
import { bubbleItems, ToolbarButton } from './bubble-items';
import { bubblePart } from './bubble-part';
import { ColorPopover } from './ColorPopover';
import { TurnIntoDropdown } from './TurnIntoDropdown';
import { useRovingFocus } from './use-roving-focus';

const DIVIDER = 'mx-0.5 h-5 w-px shrink-0 bg-border';

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
        className={FLOATING_TOOLBAR}
        onOpenAutoFocus={preventDefault}
        onCloseAutoFocus={preventDefault}
        onPointerDown={keepFocus}
        onMouseDown={keepFocus}
        onFocus={roving.onFocus}
        onKeyDown={onKeyDown}
        {...bubblePart(controller)}
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
