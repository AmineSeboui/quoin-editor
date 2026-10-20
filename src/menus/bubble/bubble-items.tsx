'use client';

import type { Ref } from 'react';
import { Bold, Code, Italic, Link, Strikethrough, Subscript, Superscript, Underline } from 'lucide-react';
import { toggleMark, type EditorState } from '../../engine';
import { isActive } from '../../engine/commands/is-active';
import type { ToolbarItem } from '../../extensions/ui-types';
import type { QuoinLabels } from '../../i18n/labels';
import { Button } from '../../ui/button';
import type { ViewController } from '../../view';

export type BubbleItems = { inline: readonly ToolbarItem[]; scripts: readonly ToolbarItem[] };

const PRESSED = 'aria-pressed:bg-accent aria-pressed:text-accent-foreground';

export function markItem(mark: string, title: string, icon: ToolbarItem['icon']): ToolbarItem {
  return {
    id: mark,
    title,
    icon,
    isActive: (state) => isActive(state, mark),
    run: (controller) => void controller.run(toggleMark(mark)),
  };
}

export const linkItem = (labels: QuoinLabels, openLink: () => void): ToolbarItem => ({
  id: 'link',
  title: labels.link,
  icon: Link,
  run: openLink,
});

/** The toolbar's own buttons: the marks and Link, which go before the menus, and the scripts, which go after them. */
export function bubbleItems(labels: QuoinLabels, openLink: () => void): BubbleItems {
  return {
    inline: [
      markItem('bold', labels.bold, Bold),
      markItem('italic', labels.italic, Italic),
      markItem('underline', labels.underline, Underline),
      markItem('strike', labels.strike, Strikethrough),
      markItem('code', labels.code, Code),
      linkItem(labels, openLink),
    ],
    scripts: [markItem('sub', labels.subscript, Subscript), markItem('sup', labels.superscript, Superscript)],
  };
}

type ToolbarButtonProps = {
  item: ToolbarItem;
  state: EditorState;
  controller: ViewController;
  buttonRef?: Ref<HTMLButtonElement>;
};

export function ToolbarButton({ item, state, controller, buttonRef }: ToolbarButtonProps) {
  if (item.available?.(state) === false) return null;
  const Icon = item.icon;
  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={item.title}
      aria-pressed={item.isActive?.(state)}
      className={PRESSED}
      onClick={() => item.run(controller)}
    >
      <Icon />
    </Button>
  );
}
