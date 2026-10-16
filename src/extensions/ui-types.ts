import type { ComponentType } from 'react';
import type { EditorState } from '../engine';
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
   * `range` covers the slash and the query, which are still in the text: `run` replaces them, through `replaceTrigger`,
   * in the transaction that makes its own change.
   */
  run(ctx: { controller: ViewController; range: SuggestionRange }): void;
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
