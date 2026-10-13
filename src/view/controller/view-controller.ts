import type { Command, Editor, Pos, Selection, Transaction } from '../../engine';
import { endOf, sameSelection, startOf, textSelection } from '../../engine/state/selection';
import type { RenderOptions } from '../dom/render-inline';
import { readSelection, writeSelection } from './dom-selection';
import { createHostRegistry, hostKey, type HostEntry, type HostRegistry } from './host-registry';
import { createHostRenderer, type HostRenderer } from './host-renderer';
import { createSelectionSync, type SelectionSync } from './selection-sync';

export type ViewControllerOptions = {
  editor: Editor;
  flush?: (fn: () => void) => void;
  render?: RenderOptions;
  onFiles?: (files: File[], at: Pos | null) => void;
  readOnly?: boolean;
};

const runNow = (fn: () => void): void => fn();

function first<T>(items: Iterable<T>): T | undefined {
  for (const item of items) return item;
  return undefined;
}

const selectionPoints = (selection: globalThis.Selection) =>
  [selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset] as const;

export class ViewController {
  readonly editor: Editor;
  readonly registry: HostRegistry = createHostRegistry();
  goalX: number | null = null;
  private readonly flush: (fn: () => void) => void;
  private readonly hosts: HostRenderer;
  private readonly blockElements: HostRegistry = createHostRegistry();
  private rootElement: HTMLElement | null = null;
  private selectionSync: SelectionSync | null = null;
  private detachRoot: (() => void) | null = null;
  private composing: string | null = null;
  private readOnlyFlag: boolean;
  private readonly readOnlyListeners = new Set<() => void>();

  constructor(options: ViewControllerOptions) {
    this.editor = options.editor;
    this.flush = options.flush ?? runNow;
    this.hosts = createHostRenderer(options.editor, options.render);
    this.readOnlyFlag = options.readOnly ?? false;
  }

  get root(): HTMLElement | null {
    return this.rootElement;
  }

  get composingKey(): string | null {
    return this.composing;
  }

  get readOnly(): boolean {
    return this.readOnlyFlag;
  }

  attach(root: HTMLElement): () => void {
    this.detachRoot?.();
    const sync = createSelectionSync(root.ownerDocument, () => this.readSelectionFromDom());
    const detach = () => {
      sync.stop();
      if (this.detachRoot !== detach) return;
      this.detachRoot = null;
      this.selectionSync = null;
      this.rootElement = null;
    };
    this.rootElement = root;
    this.selectionSync = sync;
    this.detachRoot = detach;
    sync.start();
    return detach;
  }

  registerBlockElement(id: string, element: HTMLElement): () => void {
    return this.blockElements.register(id, '', element);
  }

  blockElement(id: string): HTMLElement | undefined {
    return this.blockElements.get(id, '');
  }

  dispatch(tr: Transaction): void {
    const before = this.editor.state;
    this.flush(() => this.editor.dispatch(tr));
    if (this.editor.state.doc !== before.doc) this.goalX = null;
    for (const host of this.registry.all()) {
      if (!this.isComposing(host)) this.hosts.renderIfChanged(host);
    }
    this.syncSelectionToDom();
  }

  run(command: Command): boolean {
    return command(this.editor.state, (tr) => this.dispatch(tr));
  }

  renderHost(block: string, region: string): void {
    const element = this.registry.get(block, region);
    const host = element && { block, region, element };
    if (host && !this.isComposing(host)) this.hosts.render(host);
  }

  syncSelectionToDom(): void {
    const doc = this.ownerDocument();
    const domSelection = doc?.getSelection();
    if (!doc || !domSelection || !this.ownsFocus(doc)) return;
    const before = selectionPoints(domSelection);
    writeSelection(this.registry, this.editor.state.selection, domSelection, (id) => this.blockElement(id));
    const after = selectionPoints(domSelection);
    if (before.some((point, index) => point !== after[index])) this.selectionSync?.suppressNext();
  }

  readSelectionFromDom(): void {
    const { editor } = this;
    const domSelection = this.ownerDocument()?.getSelection() ?? null;
    const selection = readSelection(this.registry, domSelection, (node) => this.blockElements.locate(node)?.block);
    if (selection === null || sameSelection(selection, editor.state.selection)) return;
    this.flush(() => editor.dispatch(editor.createTransaction().setSelection(selection).setOrigin('input')));
  }

  focus(target?: Pos | 'start' | 'end'): void {
    const { editor } = this;
    const selection = this.focusTarget(target);
    if (selection === null) return;
    if (!sameSelection(selection, editor.state.selection)) {
      this.dispatch(editor.createTransaction().setSelection(selection));
    }
    this.focusElement(editor.state.selection)?.focus();
    this.syncSelectionToDom();
  }

  setReadOnly(readOnly: boolean): void {
    const changed = readOnly !== this.readOnlyFlag;
    this.readOnlyFlag = readOnly;
    for (const { element } of this.registry.all()) element.contentEditable = readOnly ? 'false' : 'true';
    if (changed) for (const listener of [...this.readOnlyListeners]) listener();
  }

  subscribeReadOnly(listener: () => void): () => void {
    this.readOnlyListeners.add(listener);
    return () => void this.readOnlyListeners.delete(listener);
  }

  destroy(): void {
    this.detachRoot?.();
  }

  private isComposing(host: HostEntry): boolean {
    return this.composing !== null && hostKey(host.block, host.region) === this.composing;
  }

  private ownerDocument(): Document | null {
    return (this.rootElement ?? first(this.registry.all())?.element)?.ownerDocument ?? null;
  }

  // Chromium and WebKit move focus into an editable host when a script selects inside it, so the model selection is
  // only written while focus is on the editor or on nothing, never pulled away from a control the user is typing in.
  private ownsFocus(doc: Document): boolean {
    const active = doc.activeElement;
    if (!active || active === doc.body || active === this.rootElement) return true;
    return [this.registry, this.blockElements].some((registry) => registry.locate(active)?.element === active);
  }

  private focusTarget(target: Pos | 'start' | 'end' | undefined): Selection | null {
    const { doc, schema, selection } = this.editor.state;
    if (doc.blocks.length === 0) return null;
    if (target === 'end') return endOf(doc, schema, doc.blocks[doc.blocks.length - 1].id);
    if (target === 'start' || (target === undefined && selection === null)) {
      return startOf(doc, schema, doc.blocks[0].id);
    }
    return target === undefined ? selection : textSelection(target);
  }

  private focusElement(selection: Selection | null): HTMLElement | undefined {
    switch (selection?.kind) {
      case 'text': {
        const { block, region } = selection.head;
        return this.registry.get(block, region) ?? this.blockElement(block);
      }
      case 'node':
        return this.blockElement(selection.block);
      case 'blocks':
        return this.blockElement(selection.head);
      default:
        return undefined;
    }
  }
}
