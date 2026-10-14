import type { EditorState } from '../../engine';
import { createElementSlot } from './element-slot';
import { createHostRegistry, type HostRegistry } from './host-registry';
import { selectionElement, type RenderedElements } from './selection-element';
import { createTabStop } from './tab-stop';

export type DrawnElements = {
  readonly sink: HTMLElement | null;
  readonly emptyHost: HTMLElement | null;
  registerBlock(id: string, element: HTMLElement): () => void;
  block(id: string): HTMLElement | undefined;
  blockAt(node: Node): string | undefined;
  registerSink(element: HTMLElement): () => void;
  registerEmptyHost(element: HTMLElement): () => void;
  isEditorElement(element: Element): boolean;
  focusElement(): HTMLElement | undefined;
  syncTabStop(): void;
};

// The elements of the editor that can hold focus: hosts, block shells, the selection sink and the empty document's
// host. The one the selection is in takes focus and holds the only tab stop.
export function createDrawnElements(hosts: HostRegistry, state: () => EditorState): DrawnElements {
  const tabStop = createTabStop();
  const syncTabStop = () => tabStop.move(focusElement());
  const blocks = createHostRegistry(() => {
    syncTabStop();
    return syncTabStop;
  });
  const sink = createElementSlot(syncTabStop);
  const empty = createElementSlot(syncTabStop);
  const rendered: RenderedElements = {
    hosts,
    block: (id) => blocks.get(id, ''),
    sink: () => sink.element,
    empty: () => empty.element,
  };

  function focusElement(): HTMLElement | undefined {
    return selectionElement(state(), rendered);
  }

  return {
    get sink() {
      return sink.element;
    },
    get emptyHost() {
      return empty.element;
    },
    registerBlock: (id, element) => blocks.register(id, '', element),
    block: rendered.block,
    blockAt: (node) => blocks.locate(node)?.block,
    registerSink: (element) => sink.register(element),
    registerEmptyHost: (element) => empty.register(element),
    isEditorElement: (element) =>
      element === sink.element ||
      element === empty.element ||
      [hosts, blocks].some((registry) => registry.locate(element)?.element === element),
    focusElement,
    syncTabStop,
  };
}
