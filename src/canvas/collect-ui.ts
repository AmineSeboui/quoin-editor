import type { ComponentType } from 'react';
import { textRenderers } from '../blocks/text/text-renderers';
import { voidRenderers } from '../blocks/void/void-renderers';
import type { Extension } from '../engine';
import type { ExtensionUI, SlashItem, ToolbarItem } from '../extensions/ui-types';
import type { BlockMenuAction } from '../gutter/block-menu-items';
import { blockTypeSlashItems } from '../menus/slash/slash-items';
import type { AnyBlockDefinition } from '../registry';
import type { BlockRenderer, RenderOptions, ViewController } from '../view';

export type CollectedUi = {
  slashItems: readonly SlashItem[];
  bubbleItems: readonly ToolbarItem[];
  blockMenuItems: readonly BlockMenuAction[];
  renderers: Readonly<Record<string, BlockRenderer>>;
  render: RenderOptions | undefined;
  overlays: readonly ComponentType<{ controller: ViewController }>[];
};

/** Every definition draws as a void block, except the types the canvas draws itself: its text blocks and the divider. */
export function canvasRenderers(definitions: readonly AnyBlockDefinition[]): Readonly<Record<string, BlockRenderer>> {
  return { ...voidRenderers(definitions), ...textRenderers };
}

/** The UI an extension adds, read with care: the engine leaves the field untyped. */
export function extensionUi(extension: Extension): ExtensionUI {
  const { ui } = extension;
  return typeof ui === 'object' && ui !== null ? (ui as ExtensionUI) : {};
}

function mergeRender(uis: readonly ExtensionUI[]): RenderOptions | undefined {
  const given = uis.flatMap(({ render }) => (render === undefined ? [] : [render]));
  if (given.length === 0) return undefined;
  return given.reduce((merged, render) => ({
    atoms: { ...merged.atoms, ...render.atoms },
    widgets: { ...merged.widgets, ...render.widgets },
    atomText: render.atomText ?? merged.atomText,
  }));
}

/**
 * The UI of all the extensions, in their order, a later one winning a renderer for the same type. The slash commands
 * end with one for each registered block type, and the renderers start from the canvas's own.
 */
export function collectUi(extensions: readonly Extension[], definitions: AnyBlockDefinition[]): CollectedUi {
  const uis = extensions.map(extensionUi);
  return {
    slashItems: [...uis.flatMap((ui) => ui.slashItems ?? []), ...blockTypeSlashItems(definitions)],
    bubbleItems: uis.flatMap((ui) => ui.bubbleItems ?? []),
    blockMenuItems: uis.flatMap((ui) => ui.blockMenuItems ?? []),
    renderers: Object.assign({}, canvasRenderers(definitions), ...uis.map((ui) => ui.renderers)),
    render: mergeRender(uis),
    overlays: uis.flatMap((ui) => ui.overlays ?? []),
  };
}
