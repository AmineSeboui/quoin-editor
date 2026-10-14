import type { Command, Editor, Pos, Selection, Transaction } from '../../engine';
import { endOf, sameSelection, startOf, textSelection } from '../../engine/state/selection';
import type { RenderOptions } from '../dom/render-inline';
import { attachInput, type AttachedInput } from '../input/attach-input';
import type { KeyInterceptor } from '../input/keydown';
import { readSelection, writeSelection } from './dom-selection';
import { createHostRegistry, hostKey, type HostEntry, type HostRegistry } from './host-registry';
import { createHostRenderer, type HostRenderer } from './host-renderer';
import { createSelectionSync, samePoints, selectionPoints, type SelectionSync } from './selection-sync';

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

export class ViewController {
  readonly editor: Editor;
  readonly registry: HostRegistry = createHostRegistry((element) => {
    this.input?.observe(element);
    return () => this.input?.unobserve(element);
  });
  readonly keyInterceptors = new Set<KeyInterceptor>();
  goalX: number | null = null;
  private readonly flush: (fn: () => void) => void;
  private readonly hosts: HostRenderer;
  private readonly blockElements: HostRegistry = createHostRegistry();
  private rootElement: HTMLElement | null = null;
  private selectionSync: SelectionSync | null = null;
  private detachRoot: (() => void) | null = null;
  private input: AttachedInput | null = null;
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

  set composingKey(key: string | null) {
    this.composing = key;
  }

  get readOnly(): boolean {
    return this.readOnlyFlag;
  }

  attach(root: HTMLElement): () => void {
    this.detachRoot?.();
    const sync = createSelectionSync(root.ownerDocument, () => this.readSelectionFromDom());
    const input = attachInput(this, root);
    const detach = () => {
      sync.stop();
      input.detach();
      if (this.detachRoot !== detach) return;
      this.detachRoot = null;
      this.selectionSync = null;
      this.input = null;
      this.rootElement = null;
    };
    this.rootElement = root;
    this.selectionSync = sync;
    this.detachRoot = detach;
    this.input = input;
    sync.start();
    return detach;
  }

  registerBlockElement(id: string, element: HTMLElement): () => void {
    return this.blockElements.register(id, '', element);
  }

  blockElement(id: string): HTMLElement | undefined {
    return this.blockElements.get(id, '');
  }

  isEditorElement(element: Element): boolean {
    return [this.registry, this.blockElements].some((registry) => registry.locate(element)?.element === element);
  }

  dispatch(tr: Transaction): void {
    this.edit(() => {
      this.editor.dispatch(tr);
      return true;
    });
  }

  // Runs editor calls that dispatch on their own (insertText, handleKey, chains), then brings the hosts, the focus and
  // the DOM selection up to date once.
  edit(change: () => boolean): boolean {
    const before = this.editor.state;
    const focused = this.hasFocus();
    let handled = false;
    this.flush(() => {
      handled = change();
    });
    if (this.editor.state === before) return handled;
    if (this.editor.state.doc !== before.doc) this.goalX = null;
    for (const host of this.registry.all()) {
      if (!this.isComposing(host)) this.hosts.renderIfChanged(host);
    }
    if (focused) this.keepFocus();
    this.syncSelectionToDom();
    return handled;
  }

  run(command: Command): boolean {
    return command(this.editor.state, (tr) => this.dispatch(tr));
  }

  renderHost(block: string, region: string): void {
    const element = this.registry.get(block, region);
    const host = element && { block, region, element };
    if (host && !this.isComposing(host)) this.hosts.render(host);
  }

  domSelection(): globalThis.Selection | null {
    return this.ownerDocument()?.getSelection() ?? null;
  }

  // While an IME composes, the composing host's offset map is stale and moving the DOM selection would cancel the
  // composition, so the selection is left alone in both directions. A block range has no native form, and a caret left
  // behind in a host would be read back on the next key, so the native selection is emptied.
  syncSelectionToDom(): void {
    const doc = this.ownerDocument();
    const domSelection = doc?.getSelection();
    if (this.composing !== null || !doc || !domSelection || !this.ownsFocus(doc)) return;
    const before = selectionPoints(domSelection);
    const { selection } = this.editor.state;
    if (selection?.kind === 'blocks') domSelection.removeAllRanges();
    else writeSelection(this.registry, selection, domSelection, (id) => this.blockElement(id));
    const after = selectionPoints(domSelection);
    if (!samePoints(before, after)) this.selectionSync?.suppressNext();
  }

  readSelectionFromDom(): void {
    const { editor } = this;
    const doc = this.ownerDocument();
    if (this.composing !== null || !doc || !this.ownsFocus(doc)) return;
    const blockAt = (node: Node) => this.blockElements.locate(node)?.block;
    const selection = readSelection(this.registry, doc.getSelection(), blockAt);
    if (selection === null || sameSelection(selection, editor.state.selection)) return;
    this.goalX = null;
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
  // Chromium and Firefox leave the DOM selection in a host when a button outside takes focus, and a re-render then
  // collapses it, so the DOM selection is not read back either until focus returns.
  private ownsFocus(doc: Document): boolean {
    const active = doc.activeElement;
    if (!active || active === doc.body || active === this.rootElement) return true;
    return this.isEditorElement(active);
  }

  private hasFocus(): boolean {
    const active = this.ownerDocument()?.activeElement ?? null;
    return active !== null && this.isEditorElement(active);
  }

  // React replaces a host whose block changes kind, which drops focus, and Firefox does not move focus into another
  // host when a script selects inside it.
  private keepFocus(): void {
    const element = this.focusElement(this.editor.state.selection);
    if (this.composing === null && element && element.ownerDocument.activeElement !== element) {
      element.focus();
    }
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
