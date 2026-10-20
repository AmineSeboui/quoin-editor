import type { Command, Decoration, Editor, Pos, Transaction } from '../../engine';
import { detectMac } from '../../engine/extension/detect-mac';
import { sameSelection } from '../../engine/state/selection';
import type { RenderOptions } from '../dom/render-inline';
import type { KeyInterceptor } from '../input/keydown';
import { createCrossMode } from '../selection/cross-mode';
import { createNodeReveal } from '../selection/node-reveal';
import { focusingSink, focusSink, heldBySink } from '../selection/selection-sink';
import { createAnnouncer } from './announcer';
import { readSelection, writeSelection } from './dom-selection';
import { createDrawnElements } from './drawn-elements';
import { hasFocus, ownsFocus } from './focus-ownership';
import { focusTarget, type FocusTarget } from './focus-target';
import { createHostRegistry, hostKey, type HostEntry, type HostRegistry } from './host-registry';
import { hostDecorations } from './host-decorations';
import { createHostRenderer, type HostRenderer } from './host-renderer';
import { createOutsideChanges } from './outside-changes';
import { createReadOnly, type ReadOnly } from './read-only';
import { bindRoot, type RootBinding } from './root-binding';
import { samePoints, selectionPoints } from './selection-sync';

export type ViewControllerOptions = {
  editor: Editor;
  flush?: (fn: () => void) => void;
  render?: RenderOptions;
  onFiles?: (files: File[], at: Pos | null) => void;
  readOnly?: boolean;
  /** Which key is Mod. Defaults to the platform, as the editor's own isMac does, and must agree with it. */
  isMac?: boolean;
};

const runNow = (fn: () => void): void => fn();

function first<T>(items: Iterable<T>): T | undefined {
  for (const item of items) return item;
  return undefined;
}

export class ViewController {
  readonly editor: Editor;
  readonly registry: HostRegistry = createHostRegistry((element) => {
    this.binding?.input.observe(element);
    this.drawn.syncTabStop();
    return () => {
      this.binding?.input.unobserve(element);
      this.drawn.syncTabStop();
    };
  });
  readonly keyInterceptors = new Set<KeyInterceptor>();
  readonly nodeReveal = createNodeReveal((id) => this.blockElement(id));
  readonly announcer = createAnnouncer(() => this.editor.state);
  readonly isMac: boolean;
  readonly onFiles: ViewControllerOptions['onFiles'];
  goalX: number | null = null;
  nativeVerticalMove = false;
  dragging = false;
  composingKey: string | null = null;
  private readonly flush: (fn: () => void) => void;
  private readonly hosts: HostRenderer;
  private readonly drawn = createDrawnElements(this.registry, () => this.editor.state);
  private readonly cross = createCrossMode(this);
  private readonly outside = createOutsideChanges(() => hasFocus(this, this.ownerDocument()));
  private binding: RootBinding | null = null;
  private detachRoot: (() => void) | null = null;
  private readonly readOnlyState: ReadOnly;

  constructor(options: ViewControllerOptions) {
    this.editor = options.editor;
    this.flush = options.flush ?? runNow;
    this.onFiles = options.onFiles;
    this.isMac = options.isMac ?? detectMac();
    const decorationsOf = (block: string, region: string) => this.decorationsFor(block, region);
    this.hosts = createHostRenderer(options.editor, options.render, decorationsOf, (host) => this.binding?.input.drain(host));
    this.readOnlyState = createReadOnly(this.registry, options.readOnly ?? false);
  }

  get root(): HTMLElement | null {
    return this.binding?.root ?? null;
  }

  get readOnly(): boolean {
    return this.readOnlyState.current();
  }

  get sink(): HTMLElement | null {
    return this.drawn.sink;
  }

  get emptyHost(): HTMLElement | null {
    return this.drawn.emptyHost;
  }

  attach(root: HTMLElement): () => void {
    this.detachRoot?.();
    const binding = bindRoot(this, root, this.cross, () => {
      this.outside.committed();
      this.nodeReveal.follow(this.editor.state.selection);
      this.drawn.syncTabStop();
      this.cross.syncLater();
    });
    const detach = () => {
      binding.detach();
      if (this.detachRoot !== detach) return;
      this.detachRoot = null;
      this.binding = null;
    };
    this.binding = binding;
    this.detachRoot = detach;
    this.drawn.syncTabStop();
    return detach;
  }

  registerBlockElement(id: string, element: HTMLElement): () => void {
    return this.drawn.registerBlock(id, element);
  }

  blockElement(id: string): HTMLElement | undefined {
    return this.drawn.block(id);
  }

  blockAt(node: Node): string | undefined {
    return this.drawn.blockAt(node);
  }

  registerSink(element: HTMLElement): () => void {
    return this.drawn.registerSink(element);
  }

  // An empty document draws one host that stands for a paragraph not created yet, so it belongs to no block.
  registerEmptyHost(element: HTMLElement): () => void {
    return this.drawn.registerEmptyHost(element);
  }

  isEditorElement(element: Element): boolean {
    return this.drawn.isEditorElement(element);
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
  // the DOM selection up to date once. Focus is followed only while it is still on the editor or nowhere: a change can
  // open a popover that takes it.
  edit(change: () => boolean): boolean {
    const before = this.editor.state;
    const doc = this.ownerDocument();
    const focused = hasFocus(this, doc);
    let handled = false;
    this.flush(() =>
      this.outside.inside(() => {
        handled = change();
      }),
    );
    if (this.editor.state === before) return handled;
    if (this.editor.state.doc !== before.doc) this.goalX = null;
    this.refreshHosts();
    this.cross.sync();
    if (focused && doc !== null && ownsFocus(this, doc)) this.keepFocus();
    this.syncSelectionToDom();
    return handled;
  }

  // A change made outside edit() reaches the hosts when React draws them, so the selection is written back once that
  // has happened, and focus follows a host the change replaced.
  afterRender(): void {
    const doc = this.ownerDocument();
    if (!this.outside.takeFocused() || !doc || !ownsFocus(this, doc)) return;
    this.cross.sync();
    this.keepFocus();
    this.syncSelectionToDom();
  }

  refreshHosts(): void {
    for (const host of this.registry.all()) {
      if (!this.isComposing(host)) this.hosts.renderIfChanged(host);
    }
  }

  run(command: Command): boolean {
    return command(this.editor.state, (tr) => this.dispatch(tr));
  }

  announce(message: string): void {
    this.announcer.announce(message);
  }

  // A redraw of the decorations alone, such as one that follows a selection the browser made, replaces the nodes that
  // selection sits in, and nothing else writes it back.
  renderHost(block: string, region: string): void {
    const element = this.registry.get(block, region);
    const host = element && { block, region, element };
    if (!host || this.isComposing(host) || !this.hosts.render(host)) return;
    if (element.contains(this.domSelection()?.focusNode ?? null)) this.syncSelectionToDom();
  }

  domSelection(): globalThis.Selection | null {
    return this.ownerDocument()?.getSelection() ?? null;
  }

  // While an IME composes, the composing host's offset map is stale and moving the DOM selection would cancel the
  // composition, so the selection is left alone in both directions. A selection across hosts or of whole blocks has no
  // native form in the hosts and is held by the sink. Where no sink is drawn, a node selection falls back to its shell,
  // and a caret left behind in a host would be read back on the next key, so a block range empties the native selection.
  syncSelectionToDom(): void {
    const doc = this.ownerDocument();
    const domSelection = doc?.getSelection();
    if (focusingSink(this) || this.composingKey !== null || !doc || !domSelection || !ownsFocus(this, doc)) return;
    const before = selectionPoints(domSelection);
    const { selection } = this.editor.state;
    if (heldBySink(selection) && this.sink !== null) focusSink(this);
    else if (selection?.kind === 'blocks') domSelection.removeAllRanges();
    else writeSelection(this.registry, selection, domSelection, (id) => this.blockElement(id));
    this.nodeReveal.show(selection);
    const after = selectionPoints(domSelection);
    if (!samePoints(before, after)) this.binding?.selectionSync.suppressNext();
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
    if (!this.nativeVerticalMove) this.goalX = null;
    this.flush(() =>
      this.outside.inside(() => editor.dispatch(editor.createTransaction().setSelection(selection).setOrigin('input'))),
    );
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
    this.takeFocus();
    this.syncSelectionToDom();
  }

  setReadOnly(readOnly: boolean): void {
    this.readOnlyState.set(readOnly);
  }

  subscribeReadOnly(listener: () => void): () => void {
    return this.readOnlyState.subscribe(listener);
  }

  destroy(): void {
    this.detachRoot?.();
  }

  private isComposing(host: HostEntry): boolean {
    return this.composingKey !== null && hostKey(host.block, host.region) === this.composingKey;
  }

  private ownerDocument(): Document | null {
    return (this.binding?.root ?? first(this.registry.all())?.element)?.ownerDocument ?? null;
  }

  // React replaces a host whose block changes kind, which drops focus, and Firefox does not move focus into another
  // host when a script selects inside it.
  private keepFocus(): void {
    if (this.composingKey === null) this.takeFocus();
  }

  private takeFocus(): void {
    const element = this.drawn.focusElement();
    if (!element || element.ownerDocument.activeElement === element) return;
    if (element === this.sink) focusSink(this);
    else element.focus();
  }
}
