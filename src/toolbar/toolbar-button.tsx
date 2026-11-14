'use client';

import type { Ref } from 'react';
import { useQuoin } from '../context';
import type { EditorState } from '../engine';
import type { ToolbarItem } from '../extensions/ui-types';
import { formatShortcut } from '../shortcuts/format-shortcut';
import { IconButton } from '../ui/icon-button';
import type { ViewController } from '../view';

/**
 * A toolbar button, which may say that it opens a dialog, as Link opens the link popover, and when it would do
 * nothing, as Undo with nothing to undo: it stays in the row, marked unavailable, so the row keeps its place.
 */
export type KitItem = ToolbarItem & { readonly opensDialog?: boolean; enabled?(state: EditorState): boolean };

const PRESSED = 'aria-pressed:bg-muted aria-pressed:text-foreground';

type ToolbarButtonProps = {
  item: KitItem;
  state: EditorState;
  controller: ViewController;
  buttonRef?: Ref<HTMLButtonElement>;
};

export function ToolbarButton({ item, state, controller, buttonRef }: ToolbarButtonProps) {
  const { labels } = useQuoin();
  if (item.available?.(state) === false) return null;
  const Icon = item.icon;
  const disabled = item.enabled?.(state) === false;
  return (
    <IconButton
      ref={buttonRef}
      type="button"
      label={item.title}
      shortcut={item.shortcut === undefined ? undefined : formatShortcut(item.shortcut, { isMac: controller.isMac, labels })}
      aria-pressed={item.isActive?.(state)}
      aria-haspopup={item.opensDialog ? 'dialog' : undefined}
      aria-disabled={disabled || undefined}
      className={PRESSED}
      onClick={() => {
        if (!disabled) item.run(controller);
      }}
    >
      <Icon />
    </IconButton>
  );
}
