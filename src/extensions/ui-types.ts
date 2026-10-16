import type { ComponentType } from 'react';
import type { Command, EditorState } from '../engine';
import type { BlockMenuAction } from '../gutter/block-menu-items';
import type { SlashGroup } from '../i18n/labels';
import type { BlockRenderer, RenderOptions, ViewController } from '../view';

export type { SlashGroup };

export type SuggestionRange = { block: string; region: string; from: number; to: number };

export type SlashItem = {
  id: string;
  title: string;
  description?: string;
  group: SlashGroup;
  icon?: ComponentType<{ className?: string }>;
  keywords?: readonly string[];
  /** A key in the keymap's own form, such as `Mod-Alt-1`. */
  shortcut?: string;
  available?(state: EditorState): boolean;
  /**
   * The change the item makes, run once the menu has removed the slash and the query, in the same transaction, so one
   * undo brings the query back. `state` and `range` are those of the moment the item is chosen.
   */
  command?(ctx: { state: EditorState; range: SuggestionRange }): Command;
  /**
   * Work no command can do, such as opening a dialog, called once the slash and the query are gone. `range` is the
   * empty range where they were.
   */
  run?(ctx: { controller: ViewController; range: SuggestionRange }): void;
};

export type ToolbarItem = {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  shortcut?: string;
  isActive?(state: EditorState): boolean;
  available?(state: EditorState): boolean;
  run(controller: ViewController): void;
};

/** What an extension adds to the canvas UI, through its `ui` field. */
export type ExtensionUI = {
  slashItems?: readonly SlashItem[];
  bubbleItems?: readonly ToolbarItem[];
  blockMenuItems?: readonly BlockMenuAction[];
  renderers?: Readonly<Record<string, BlockRenderer>>;
  render?: RenderOptions;
  overlays?: readonly ComponentType<{ controller: ViewController }>[];
};
