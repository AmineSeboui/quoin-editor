'use client';

import type { KeyboardEvent, ReactNode, Ref, RefObject } from 'react';
import type { EditorState } from '../../engine';
import type { ToolbarItem } from '../../extensions/ui-types';
import { ToolbarButton } from '../../menus/bubble/bubble-items';
import { bubblePart } from '../../menus/bubble/bubble-part';
import { useRovingFocus } from '../../menus/bubble/use-roving-focus';
import { keepFocus } from '../../menus/floating/keep-focus';
import { useFocusKey } from '../../menus/floating/use-focus-key';
import type { VirtualAnchor } from '../../menus/floating/virtual-anchor';
import { FLOATING_TOOLBAR } from '../../ui/menu-styles';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { preventDefault } from '../../ui/prevent-default';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { useEditorState } from '../../view/react/use-editor-state';
import { blockPart } from './block-part';

const wholeState = (state: EditorState) => state;

type NodeToolbarProps = {
  blockId: string;
  controller: ViewController;
  label: string;
  anchor: RefObject<VirtualAnchor>;
  items: readonly ToolbarItem[];
  /** The part of the block Tab goes on to from the toolbar. */
  next?: string;
  buttonRefs?: Readonly<Record<string, Ref<HTMLButtonElement>>>;
  /** Drawn in the toolbar after its buttons, such as the file input a button opens. */
  children?: ReactNode;
  /** Drawn beside the toolbar, such as a popover a button opens. */
  popover?: ReactNode;
};

/**
 * The toolbar of a block selected as a whole. Alt+F10 moves into it, the arrows walk its buttons, Tab goes on to the
 * `next` part of the block, and Shift+Tab or Escape go back to the block.
 */
export function NodeToolbar(props: NodeToolbarProps) {
  const { blockId, controller, label, anchor, items, next, buttonRefs, children, popover } = props;
  const state = useEditorState(controller, wholeState);
  const roving = useRovingFocus();
  useFocusKey(controller, roving.focusCurrent);

  const onKeyDown = (event: KeyboardEvent) => {
    if (!roving.owns(event.target) || isComposingKey(controller, event.nativeEvent)) return;
    const tab = event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey;
    const ahead = tab && !event.shiftKey && next !== undefined ? blockPart(controller, blockId, next) : undefined;
    if (ahead !== undefined) ahead.focus();
    else if (tab || event.key === 'Escape') controller.focus();
    else return roving.onKeyDown(event);
    event.preventDefault();
  };

  return (
    <Popover open modal={false}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        ref={roving.ref}
        role="toolbar"
        aria-label={label}
        side="top"
        className={FLOATING_TOOLBAR}
        onOpenAutoFocus={preventDefault}
        onCloseAutoFocus={preventDefault}
        onPointerDown={keepFocus}
        onMouseDown={keepFocus}
        onFocus={roving.onFocus}
        onKeyDown={onKeyDown}
        {...bubblePart(controller)}
      >
        {items.map((item) => (
          <ToolbarButton key={item.id} item={item} state={state} controller={controller} buttonRef={buttonRefs?.[item.id]} />
        ))}
        {children}
      </PopoverContent>
      {popover}
    </Popover>
  );
}
