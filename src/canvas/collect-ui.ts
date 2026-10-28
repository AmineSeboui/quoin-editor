import type { ComponentType } from 'react';
import { drawnAsText, drawnInPlace } from '../blocks/block-drawing';
import { inPlaceOverlays, inPlaceRenderers } from '../blocks/in-place-renderers';
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
  blockNames: Readonly<Record<string, string>>;
  render: RenderOptions | undefined;
  overlays: readonly ComponentType<{ controller: ViewController }>[];
};

/**
 * Every definition draws as a void block, except the types the canvas draws itself: its text blocks, the divider and the
 * blocks it edits in place.
 */
export function canvasRenderers(
  definitions: readonly AnyBlockDefinition[],
  readOnly = false,
): Readonly<Record<string, BlockRenderer>> {
  const ownText = Object.entries(textRenderers).filter(([type]) => drawnAsText(definitions, type, readOnly));
  const inPlace = Object.entries(inPlaceRenderers).filter(([type]) => drawnInPlace(definitions, type));
  return { ...voidRenderers(definitions), ...Object.fromEntries([...ownText, ...inPlace]) };
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
export function collectUi(
  extensions: readonly Extension[],
  definitions: AnyBlockDefinition[],
  readOnly = false,
  onError?: () => ((error: Error) => void) | undefined,
): CollectedUi {
  const uis = extensions.map(extensionUi);
  return {
    slashItems: [...uis.flatMap((ui) => ui.slashItems ?? []), ...blockTypeSlashItems(definitions, onError)],
    bubbleItems: uis.flatMap((ui) => ui.bubbleItems ?? []),
    blockMenuItems: uis.flatMap((ui) => ui.blockMenuItems ?? []),
    renderers: Object.assign({}, canvasRenderers(definitions, readOnly), ...uis.map((ui) => ui.renderers)),
    blockNames: Object.assign({}, ...uis.map((ui) => ui.blockNames)),
    render: mergeRender(uis),
    overlays: [
      ...uis.flatMap((ui) => ui.overlays ?? []),
      ...Object.entries(inPlaceOverlays).flatMap(([type, overlay]) => (drawnInPlace(definitions, type) ? [overlay] : [])),
    ],
  };
}
