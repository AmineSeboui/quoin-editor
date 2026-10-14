import type { Command, Decoration, Editor, Pos, Transaction } from '../../engine';
import { sameSelection } from '../../engine/state/selection';
import type { RenderOptions } from '../dom/render-inline';
import { attachInput, type AttachedInput } from '../input/attach-input';
import type { KeyInterceptor } from '../input/keydown';
import { createCrossMode } from '../selection/cross-mode';
import { isCrossSelection } from '../selection/selection-decorations';
import { focusSink } from '../selection/selection-sink';
import { readSelection, writeSelection } from './dom-selection';
import { createElementSlot } from './element-slot';
import { hasFocus, ownsFocus } from './focus-ownership';
import { focusTarget, type FocusTarget } from './focus-target';
import { createHostRegistry, hostKey, type HostEntry, type HostRegistry } from './host-registry';
import { hostDecorations } from './host-decorations';
import { createHostRenderer, type HostRenderer } from './host-renderer';
import { selectionElement, type RenderedElements } from './selection-element';
import { createSelectionSync, samePoints, selectionPoints, type SelectionSync } from './selection-sync';
import { createTabStop } from './tab-stop';

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
    this.syncTabStop();
    return () => {
      this.input?.unobserve(element);
      this.syncTabStop();
    };
  });
  readonly keyInterceptors = new Set<KeyInterceptor>();
  readonly onFiles: ViewControllerOptions['onFiles'];
  goalX: number | null = null;
  dragging = false;
  composingKey: string | null = null;
  private readonly flush: (fn: () => void) => void;
  private readonly hosts: HostRenderer;
  private readonly blockElements: HostRegistry = createHostRegistry(() => {
    this.syncTabStop();
    return () => this.syncTabStop();
  });
  private readonly rendered: RenderedElements = {
    hosts: this.registry,
    block: (id) => this.blockElement(id),
    sink: () => this.sinkSlot.element,
    empty: () => this.emptySlot.element,
  };
  private readonly cross = createCrossMode(this);
  private readonly sinkSlot = createElementSlot(() => this.syncTabStop());
  private readonly emptySlot = createElementSlot(() => this.syncTabStop());
  private readonly tabStop = createTabStop();
  private rootElement: HTMLElement | null = null;
  private selectionSync: SelectionSync | null = null;
  private detachRoot: (() => void) | null = null;
  private input: AttachedInput | null = null;
  private readOnlyFlag: boolean;
  private readonly readOnlyListeners = new Set<() => void>();

  constructor(options: ViewControllerOptions) {
    this.editor = options.editor;
    this.flush = options.flush ?? runNow;
    this.onFiles = options.onFiles;
    const decorationsOf = (block: string, region: string) => this.decorationsFor(block, region);
    this.hosts = createHostRenderer(options.editor, options.render, decorationsOf, (host) => this.input?.drain(host));
    this.readOnlyFlag = options.readOnly ?? false;
  }

  get root(): HTMLElement | null {
    return this.rootElement;
  }

  get readOnly(): boolean {
    return this.readOnlyFlag;
  }

  get sink(): HTMLElement | null {
    return this.sinkSlot.element;
  }

  get emptyHost(): HTMLElement | null {
    return this.emptySlot.element;
  }

  attach(root: HTMLElement): () => void {
    this.detachRoot?.();
    const sync = createSelectionSync(root.ownerDocument, () => this.readSelectionFromDom());
    const input = attachInput(this, root);
    const unsubscribe = this.editor.subscribe(() => {
      this.syncTabStop();
      this.cross.syncLater();
    });
    const detachCross = this.cross.attach(root);
    const detach = () => {
      sync.stop();
      input.detach();
      unsubscribe();
      detachCross();
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
    this.syncTabStop();
    return detach;
  }

  registerBlockElement(id: string, element: HTMLElement): () => void {
    return this.blockElements.register(id, '', element);
  }

  blockElement(id: string): HTMLElement | undefined {
    return this.blockElements.get(id, '');
  }

  blockAt(node: Node): string | undefined {
    return this.blockElements.locate(node)?.block;
  }

  registerSink(element: HTMLElement): () => void {
    return this.sinkSlot.register(element);
  }

  // An empty document draws one host that stands for a paragraph not created yet, so it belongs to no block.
  registerEmptyHost(element: HTMLElement): () => void {
    return this.emptySlot.register(element);
  }

  isEditorElement(element: Element): boolean {
    if (element === this.sinkSlot.element || element === this.emptySlot.element) return true;
    return [this.registry, this.blockElements].some((registry) => registry.locate(element)?.element === element);
  }

  decorationsFor(block: string, region: string): readonly Decoration[] {
    return hostDecorations(this.editor, block, region, this.cross.mode);
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
    const focused = hasFocus(this, this.ownerDocument());
    let handled = false;
    this.flush(() => {
      handled = change();
    });
    if (this.editor.state === before) return handled;
    if (this.editor.state.doc !== before.doc) this.goalX = null;
    this.refreshHosts();
    this.cross.sync();
    if (focused) this.keepFocus();
    this.syncSelectionToDom();
    return handled;
  }

  refreshHosts(): void {
    for (const host of this.registry.all()) {
      if (!this.isComposing(host)) this.hosts.renderIfChanged(host);
    }
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
  // behind in a host would be read back on the next key, so the native selection is emptied. A selection across hosts
  // has none either and is held by the sink.
  syncSelectionToDom(): void {
    const doc = this.ownerDocument();
    const domSelection = doc?.getSelection();
    if (this.composingKey !== null || !doc || !domSelection || !ownsFocus(this, doc)) return;
    const before = selectionPoints(domSelection);
    const { selection } = this.editor.state;
    if (selection?.kind === 'blocks') domSelection.removeAllRanges();
    else if (isCrossSelection(selection)) focusSink(this);
    else writeSelection(this.registry, selection, domSelection, (id) => this.blockElement(id));
    const after = selectionPoints(domSelection);
    if (!samePoints(before, after)) this.selectionSync?.suppressNext();
  }

  // A pointer drag across hosts sets the model selection itself, while the browser keeps extending its own. Leaving
  // cross mode re-renders the hosts that drew it as decorations, which can remove the node holding the caret, so the
  // selection is written back.
  readSelectionFromDom(): void {
    const { editor } = this;
    const doc = this.ownerDocument();
    if (this.composingKey !== null || this.dragging || !doc || !ownsFocus(this, doc)) return;
    const selection = readSelection(this.registry, doc.getSelection(), (node) => this.blockAt(node));
    if (selection === null || sameSelection(selection, editor.state.selection)) return;
    const wasCross = this.cross.active;
    this.goalX = null;
    this.flush(() => editor.dispatch(editor.createTransaction().setSelection(selection).setOrigin('input')));
    this.cross.sync();
    if (!wasCross && !this.cross.active) return;
    this.keepFocus();
    this.syncSelectionToDom();
  }

  focus(target?: FocusTarget): void {
    const { editor } = this;
    const selection = focusTarget(editor.state, target);
    if (selection !== null && !sameSelection(selection, editor.state.selection)) {
      this.dispatch(editor.createTransaction().setSelection(selection));
    }
    this.focusElement()?.focus();
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
    return this.composingKey !== null && hostKey(host.block, host.region) === this.composingKey;
  }

  private ownerDocument(): Document | null {
    return (this.rootElement ?? first(this.registry.all())?.element)?.ownerDocument ?? null;
  }

  // React replaces a host whose block changes kind, which drops focus, and Firefox does not move focus into another
  // host when a script selects inside it.
  private keepFocus(): void {
    const element = this.focusElement();
    if (this.composingKey === null && element && element.ownerDocument.activeElement !== element) {
      element.focus();
    }
  }

  private focusElement(): HTMLElement | undefined {
    return selectionElement(this.editor.state, this.rendered);
  }

  private syncTabStop(): void {
    this.tabStop.move(this.focusElement());
  }
}
