import type { EditorState, Selection } from '../../engine';
import { headBlockId } from '../../engine/commands/block-helpers';
import { hidingToggle } from '../../engine/commands/collapsed-toggle';
import { startOf } from '../../engine/state/selection';
import type { HostRegistry } from './host-registry';

export type RenderedElements = {
  readonly hosts: HostRegistry;
  readonly block: (id: string) => HTMLElement | undefined;
};

function elementFor({ doc }: EditorState, selection: Selection | null, rendered: RenderedElements): HTMLElement | undefined {
  const id = headBlockId(selection);
  const index = id === null ? undefined : doc.index.get(id);
  if (id === null || index === undefined) return undefined;
  const hiding = hidingToggle(doc, index + 1);
  if (hiding !== null) return rendered.block(doc.blocks[hiding].id);
  const host = selection?.kind === 'text' ? rendered.hosts.get(id, selection.head.region) : undefined;
  return host ?? rendered.block(id);
}

// The one element that takes focus and the editor's only tab stop. A head that is not drawn falls back to the closed
// toggle hiding it, then to its block, then to the first block.
export function selectionElement(state: EditorState, rendered: RenderedElements): HTMLElement | undefined {
  const { doc, schema, selection } = state;
  const element = elementFor(state, selection, rendered);
  if (element || doc.blocks.length === 0) return element;
  return elementFor(state, startOf(doc, schema, doc.blocks[0].id), rendered);
}
