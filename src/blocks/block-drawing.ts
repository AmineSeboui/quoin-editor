import { blockByType, type AnyBlockDefinition } from '../registry';
import { coreBlocks } from './core';
import { textRenderers } from './text/text-renderers';

const QUOIN_DEFINITIONS: ReadonlyMap<string, AnyBlockDefinition> = new Map(coreBlocks.map((core) => [core.type, core]));

// The engine keeps a caret in the text of these types and never selects them as blocks, which a void block draws no
// host for, so only a canvas nobody edits can draw them from a host's definition.
const TYPED_IN_PLACE: readonly string[] = ['MARKDOWN', 'CALLOUT', 'TOGGLE'];

// A copy of Quoin's own definition that draws and edits the same way, as one a host relabels, is still Quoin's.
function hostDefines(definitions: readonly AnyBlockDefinition[], type: string): boolean {
  const definition = blockByType(definitions, type);
  const core = QUOIN_DEFINITIONS.get(type);
  if (definition === undefined) return false;
  return core === undefined || definition.preview !== core.preview || definition.editor !== core.editor;
}

/**
 * Whether the canvas draws the type with a text block of its own. A host's own definition of one of those types is
 * drawn as a void block instead: always for the divider, and for the types typed in place only on a read-only canvas.
 */
export function drawnAsText(definitions: readonly AnyBlockDefinition[], type: string, readOnly: boolean): boolean {
  if (!Object.hasOwn(textRenderers, type)) return false;
  return !hostDefines(definitions, type) || (!readOnly && TYPED_IN_PLACE.includes(type));
}

/** The types typed in place that the host defines, which an editable canvas keeps drawing as its own text blocks. */
export const definedTypedInPlace = (definitions: readonly AnyBlockDefinition[]): string[] =>
  TYPED_IN_PLACE.filter((type) => hostDefines(definitions, type));

/** Whether a block of the type that an editable canvas inserts is drawn as a void block with an editor to open. */
export const opensEditor = (definitions: readonly AnyBlockDefinition[], type: string): boolean =>
  !drawnAsText(definitions, type, false) && blockByType(definitions, type)?.editor !== undefined;
