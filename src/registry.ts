import type { ComponentType } from 'react';
import type { BlockEditorProps, BlockPreviewProps } from './types';

/** The fields every block definition carries, whatever it can do with its data. */
type BlockDefinitionCommon<D extends object> = {
  type: string;
  label: string;
  /** Any icon component, such as a lucide one, that takes a class name and can be hidden from assistive technology. */
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  /**
   * Called when a new block of this type is inserted, to seed its data.
   * `NoInfer` keeps `D` inferred from `editor` and `preview` alone, so the seed is checked
   * against the editor's data type instead of widening it.
   */
  initialData?: () => NoInfer<D>;
  /** Whether the block is offered in the slash palette and inserter; defaults to true. */
  inSlashPalette?: boolean;
  /**
   * Renders this block's editor permanently instead of a preview you click to edit.
   * Also supply a `preview`: a read-only canvas draws the preview rather than the editor,
   * so without one the block's content is invisible there.
   */
  alwaysEditing?: boolean;
};

/**
 * Describes one block type: how to label it, how to draw it at rest, how to edit it.
 *
 * Supply `editor`, `preview`, or both, and the canvas does the rest. A definition with no
 * `preview` is edit-only: a read-only canvas has nothing to draw for it but its label.
 * A definition with no `editor` can never be edited in the canvas, which is what a block
 * whose content belongs to a server-side record wants; the card offers no edit affordance
 * for it and a click goes through to whatever the preview itself renders.
 *
 * Omitting both is a type error, because such a block would only ever draw its own label.
 */
export type BlockDefinition<D extends object = Record<string, unknown>> =
  | (BlockDefinitionCommon<D> & {
      editor: ComponentType<BlockEditorProps<D>>;
      /**
       * What the block shows when it is not being edited. Optional so a host can register an
       * edit-only block type, and overridable so a host can supply rich rendering (a full
       * markdown pipeline, a chart) without Quoin depending on one.
       */
      preview?: ComponentType<BlockPreviewProps<D>>;
    })
  | (BlockDefinitionCommon<D> & {
      /** Omitted: this block is never editable in the canvas. */
      editor?: undefined;
      /** Required here, because it is the only thing that can draw the block. */
      preview: ComponentType<BlockPreviewProps<D>>;
    });

/** A definition with its data type erased, so definitions of different shapes compose in one array. */
export type AnyBlockDefinition = BlockDefinition<Record<string, unknown>>;

/**
 * Types `data` inside your editor component, then erases the generic on the way out.
 * The erasure is deliberate: `D` appears in both covariant and contravariant positions
 * on `editor`, so without it an array of differently-shaped definitions will not typecheck.
 * `initialData` is checked against the editor's data type. That relies on `NoInfer`, so
 * TypeScript 5.4 or later is required.
 *
 * `D` defaults to `Record<string, unknown>`, so a definition whose components take no
 * annotation still gets a usable `data` rather than a bare `object`.
 */
export function defineBlock<D extends object = Record<string, unknown>>(
  definition: BlockDefinition<D>,
): AnyBlockDefinition {
  return definition as unknown as AnyBlockDefinition;
}

/** The definition for a type, or undefined; the last registration of a type wins, so a host can override a core block. */
export function blockByType(
  definitions: AnyBlockDefinition[],
  type: string,
): AnyBlockDefinition | undefined {
  for (let i = definitions.length - 1; i >= 0; i -= 1) {
    if (definitions[i].type === type) return definitions[i];
  }
  return undefined;
}

/** The definitions offered in the slash palette, in registration order, one per type, with the last registration of a type winning. */
export function paletteBlocks(definitions: AnyBlockDefinition[]): AnyBlockDefinition[] {
  const seen = new Set<string>();
  const out: AnyBlockDefinition[] = [];
  for (let i = definitions.length - 1; i >= 0; i -= 1) {
    const d = definitions[i];
    if (seen.has(d.type)) continue;
    // Claim the type BEFORE honouring the opt-out, so a hidden override suppresses the
    // definition it replaces instead of letting the earlier one reappear. Without this,
    // the palette can offer a block that `blockByType` resolves to a different definition.
    seen.add(d.type);
    if (d.inSlashPalette === false) continue;
    out.push(d);
  }
  return out.reverse();
}
