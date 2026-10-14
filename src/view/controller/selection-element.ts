import type { EditorState, Selection } from '../../engine';
import { headBlockId } from '../../engine/commands/block-helpers';
import { startOf } from '../../engine/state/selection';
import { hidingToggleAt } from '../navigation/visible-blocks';
import { heldBySink } from '../selection/selection-sink';
import type { HostRegistry } from './host-registry';

export type RenderedElements = {
  readonly hosts: HostRegistry;
  readonly block: (id: string) => HTMLElement | undefined;
  readonly sink?: () => HTMLElement | null;
  readonly empty?: () => HTMLElement | null;
};

function elementFor({ doc }: EditorState, selection: Selection | null, rendered: RenderedElements): HTMLElement | undefined {
  const id = headBlockId(selection);
  const index = id === null ? undefined : doc.index.get(id);
  if (id === null || index === undefined) return undefined;
  const hiding = hidingToggleAt(doc, index);
  if (hiding !== null) return rendered.block(doc.blocks[hiding].id);
  const host = selection?.kind === 'text' ? rendered.hosts.get(id, selection.head.region) : undefined;
  return host ?? rendered.block(id);
}

// The one element that takes focus and the editor's only tab stop. A selection across hosts or of whole blocks is held
// by the sink, and a document without blocks by the host it shows instead. A head that is not drawn falls back to the
// closed toggle hiding it, then to its block, then to the first block.
export function selectionElement(state: EditorState, rendered: RenderedElements): HTMLElement | undefined {
  const { doc, schema, selection } = state;
  if (doc.blocks.length === 0) return rendered.empty?.() ?? undefined;
  const sink = heldBySink(selection) ? rendered.sink?.() : null;
  if (sink) return sink;
  return elementFor(state, selection, rendered) ?? elementFor(state, startOf(doc, schema, doc.blocks[0].id), rendered);
}
