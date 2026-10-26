import type { Command, Decoration, Editor, EditorState, Pos, Selection, Transaction } from '../../engine';
import { detectMac } from '../../engine/extension/detect-mac';
import { sameSelection } from '../../engine/state/selection';
import type { RenderOptions } from '../dom/render-inline';
import type { KeyInterceptor } from '../input/keydown';
import { createCrossMode } from '../selection/cross-mode';
import { createNodeReveal } from '../selection/node-reveal';
import { inPlace } from '../selection/in-place';
import { focusSink } from '../selection/selection-sink';
import { createAnnouncer } from './announcer';
import { dispatchSelection } from './dispatch-selection';
import { createDrawnElements } from './drawn-elements';
import { hasFocus, ownsFocus } from './focus-ownership';
import { focusTarget, type FocusTarget } from './focus-target';
import { createHostRegistry, hostKey, type HostEntry, type HostRegistry } from './host-registry';
import { hostDecorations } from './host-decorations';
import { createHostRenderer, type HostRenderer } from './host-renderer';
import { createOutsideChanges } from './outside-changes';
import { createReadOnly, type ReadOnly } from './read-only';
import { bindRoot, type RootBinding } from './root-binding';
import { movedSelection, writeModelSelection } from './selection-io';

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

export class ViewController {
  readonly editor: Editor;
  readonly registry: HostRegistry = createHostRegistry((element) => {
    this.#binding?.input.observe(element);
    this.#drawn.syncTabStop();
    return () => {
      this.#binding?.input.unobserve(element);
      this.#drawn.syncTabStop();
    };
  });
  readonly keyInterceptors = new Set<KeyInterceptor>();
  readonly nodeReveal = createNodeReveal((id) => this.blockElement(id));
  readonly announcer = createAnnouncer(() => this.#said);
  readonly isMac: boolean;
  readonly onFiles: ViewControllerOptions['onFiles'];
  goalX: number | null = null;
  nativeVerticalMove = false;
  dragging = false;
  composingKey: string | null = null;
  readonly #flush: (fn: () => void) => void;
  readonly #hosts: HostRenderer;
  readonly #drawn = createDrawnElements(this.registry, () => this.editor.state);
  readonly #cross = createCrossMode(this);
  readonly #outside = createOutsideChanges(
    () => hasFocus(this, this.#ownerDocument()),
    (model) => movedSelection(this, this.#ownerDocument(), model),
  );
  #binding: RootBinding | null = null;
  #quiet = false;
  #loud = false;
  #said?: EditorState;
  #detachRoot: (() => void) | null = null;
  readonly #readOnlyState: ReadOnly;

  constructor(options: ViewControllerOptions) {
    this.editor = options.editor;
    // Subscribed first, so a listener that announces after a change finds the change already noted.
    options.editor.subscribe((state, tr) => {
      if (tr?.origin !== 'remote') this.#said = state;
    });
    this.#flush = options.flush ?? runNow;
    this.onFiles = options.onFiles;
    this.isMac = options.isMac ?? detectMac();
    const decorationsOf = (block: string, region: string) => this.decorationsFor(block, region);
    const drain = (element: HTMLElement) => this.#binding?.input.drain(element);
    this.#hosts = createHostRenderer(options.editor, options.render, decorationsOf, drain);
    this.#readOnlyState = createReadOnly(this.registry, options.readOnly ?? false);
  }

  get root(): HTMLElement | null {
    return this.#binding?.root ?? null;
  }

  get readOnly(): boolean {
    return this.#readOnlyState.current();
  }

  get sink(): HTMLElement | null {
    return this.#drawn.sink;
  }

  get emptyHost(): HTMLElement | null {
    return this.#drawn.emptyHost;
  }

  attach(root: HTMLElement): () => void {
    this.#detachRoot?.();
    const binding = bindRoot(this, root, this.#cross, (_, tr) => {
      this.#quiet ||= tr?.origin === 'remote' && tr.docChanged;
      this.#loud ||= tr?.origin !== 'remote';
      this.#outside.committed(tr);
      this.nodeReveal.follow(this.editor.state.selection);
      this.#drawn.syncTabStop();
      this.#cross.syncLater();
    });
    const unmount = this.editor.mount();
    const detach = () => {
      unmount();
      binding.detach();
      if (this.#detachRoot !== detach) return;
      this.#detachRoot = null;
      this.#binding = null;
    };
    this.#binding = binding;
    this.#detachRoot = detach;
    this.#drawn.syncTabStop();
    return detach;
  }

  registerBlockElement(id: string, element: HTMLElement): () => void {
    return this.#drawn.registerBlock(id, element);
  }

  blockElement(id: string): HTMLElement | undefined {
    return this.#drawn.block(id);
  }

  blockAt(node: Node): string | undefined {
    return this.#drawn.blockAt(node);
  }

  registerSink(element: HTMLElement): () => void {
    return this.#drawn.registerSink(element);
  }

  // An empty document draws one host that stands for a paragraph not created yet, so it belongs to no block.
  registerEmptyHost(element: HTMLElement): () => void {
    return this.#drawn.registerEmptyHost(element);
  }

  isEditorElement(element: Element): boolean {
    return this.#drawn.isEditorElement(element);
  }

  decorationsFor(block: string, region: string): readonly Decoration[] {
    return hostDecorations(this.editor, block, region, this.#cross.mode);
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
    const doc = this.#ownerDocument();
    const focused = hasFocus(this, doc);
    let handled = false;
    this.#flush(() =>
      this.#outside.inside(() => {
        handled = change();
      }),
    );
    if (this.editor.state === before) return handled;
    if (this.editor.state.doc !== before.doc) this.goalX = null;
    this.refreshHosts();
    this.#cross.sync();
    if (focused && doc !== null && ownsFocus(this, doc)) this.#keepFocus();
    this.syncSelectionToDom(true);
    return handled;
  }

  // A change made outside edit() reaches the hosts when React draws them, so the selection is written back once that
  // has happened, and focus follows a host the change replaced. A render of collaborators' changes alone, or of one
  // that changed the document, scrolls nothing doing so; a caret move of theirs leaves the rest to scroll as it would.
  afterRender(): void {
    const quiet = this.#quiet || !this.#loud;
    this.#quiet = this.#loud = false;
    const doc = this.#ownerDocument();
    const moved = this.#outside.takeMoved();
    if (!this.#outside.takeFocused() || !doc || !ownsFocus(this, doc)) return;
    if (moved) this.#selectFromDom(moved);
    this.#cross.sync();
    const follow = () => {
      this.#keepFocus(quiet);
      this.syncSelectionToDom();
    };
    if (!quiet) return follow();
    this.nodeReveal.settle(this.editor.state.selection);
    inPlace(this.root!, follow);
  }

  refreshHosts(): void {
    for (const host of this.registry.all()) {
      if (!this.#isComposing(host)) this.#hosts.renderIfChanged(host);
    }
  }

  run(command: Command): boolean {
    return this.edit(() => command(this.editor.state, this.editor.dispatch));
  }

  announce(message: string): void {
    this.announcer.announce(message);
  }

  // A redraw of the decorations alone, such as one that follows a selection the browser made, replaces the nodes that
  // selection sits in, and nothing else writes it back. It is written only while the editor holds focus: written while
  // focus is on the page, it would pull focus into the line.
  renderHost(block: string, region: string): void {
    const element = this.registry.get(block, region);
    const host = element && { block, region, element };
    if (!host || this.#isComposing(host) || !this.#hosts.render(host)) return;
    const inSelection = element.contains(this.domSelection()?.focusNode ?? null);
    if (inSelection && hasFocus(this, element.ownerDocument)) this.syncSelectionToDom();
  }

  domSelection(): globalThis.Selection | null {
    return this.#ownerDocument()?.getSelection() ?? null;
  }

  syncSelectionToDom(local?: boolean): void {
    writeModelSelection(this, this.#ownerDocument(), () => this.#binding?.selectionSync.suppressNext(), local);
  }

  // A pointer drag across hosts sets the model selection itself, while the browser keeps extending its own. Leaving
  // cross mode re-renders the hosts that drew it as decorations, which can remove the node holding the caret, so the
  // selection is written back.
  readSelectionFromDom(): void {
    const selection = movedSelection(this, this.#ownerDocument(), this.editor.state.selection);
    if (selection === null) return;
    const wasCross = this.#cross.active;
    if (!this.nativeVerticalMove) this.goalX = null;
    this.#flush(() => this.#selectFromDom(selection));
    this.#cross.sync();
    if (!wasCross && !this.#cross.active) return;
    this.#keepFocus();
    this.syncSelectionToDom();
  }

  focus(target?: FocusTarget): void {
    const { editor } = this;
    const selection = focusTarget(editor.state, target);
    if (selection !== null && !sameSelection(selection, editor.state.selection)) dispatchSelection(this, selection);
    this.#takeFocus();
    this.syncSelectionToDom();
  }

  setReadOnly(readOnly: boolean): void {
    this.#readOnlyState.set(readOnly);
  }

  subscribeReadOnly(listener: () => void): () => void {
    return this.#readOnlyState.subscribe(listener);
  }

  destroy(): void {
    this.#detachRoot?.();
  }

  #selectFromDom(selection: Selection): void {
    const { editor } = this;
    this.#outside.inside(() => editor.dispatch(editor.createTransaction().setSelection(selection).setOrigin('input')));
  }

  #isComposing(host: HostEntry): boolean {
    return this.composingKey !== null && hostKey(host.block, host.region) === this.composingKey;
  }

  #ownerDocument(): Document | null {
    return (this.#binding?.root ?? this.registry.all().next().value?.element)?.ownerDocument ?? null;
  }

  // React replaces a host whose block changes kind, which drops focus, and Firefox does not move focus into another
  // host when a script selects inside it.
  #keepFocus(preventScroll?: boolean): void {
    if (this.composingKey === null) this.#takeFocus(preventScroll);
  }

  #takeFocus(preventScroll?: boolean): void {
    const element = this.#drawn.focusElement();
    if (!element || element.ownerDocument.activeElement === element) return;
    if (element === this.sink) focusSink(this);
    else element.focus({ preventScroll });
  }
}
