---
title: Headless reference
description: Every export quoin-editor/headless adds to the engine: the hook, the editable view, the controller and the DOM map.
---

# Headless reference

`quoin-editor/headless` is the editing engine and its editable view, with none of the canvas UI. It exports everything in the [Engine reference](https://quoincloud.com/docs/editor/engine-reference) and the names here on top of it: the React layer that draws a document, and the controller that binds an editor to the page.

Each one carries the signature the published types carry, read from the package’s own source each time the site is built. [Headless](https://quoincloud.com/docs/editor/headless) shows the layer working, in one page of code.

## Hooks and components

The hook that creates the editor and its controller, and the components that draw the document and keep the selection.

### BlockPlaceholder

The text an empty block shows in its main region, read again whenever the editor state changes.

```ts
type BlockPlaceholder = (state: EditorState, block: EngineBlock) => string | undefined;
```

[BlockPlaceholder on GitHub](src/view/react/block-placeholder.ts#L8)

### BlockRenderer

```ts
type BlockRenderer = ComponentType<BlockRenderProps>;
```

[BlockRenderer on GitHub](src/view/react/block-renderer-types.ts#L6)

### BlockRenderProps

```ts
type BlockRenderProps = { block: EngineBlock; controller: ViewController };
```

[BlockRenderProps on GitHub](src/view/react/block-renderer-types.ts#L5)

### EditableRegion

```ts
function EditableRegion(props: EditableRegionProps): JSX.Element
```

[EditableRegion on GitHub](src/view/react/EditableRegion.tsx#L31)

### EditableRegionProps

```ts
type EditableRegionProps = {
  block: string;
  region: string;
  label: string;
  /** An id for the host, for a control that the host's text names. */
  id?: string;
  placeholder?: string;
  className?: string;
};
```

[EditableRegionProps on GitHub](src/view/react/EditableRegion.tsx#L12)

### EditorView

The editable view with none of the canvas UI: one editable host per text block, drawn by the renderers given to it. It keeps the element it drew for each block, so define `renderers` once rather than on every render.

```ts
function EditorView(props: EditorViewProps): JSX.Element
```

[EditorView on GitHub](src/view/react/EditorView.tsx#L57)

### EditorViewProps

```ts
type EditorViewProps = {
  controller: ViewController;
  renderers?: Readonly<Record<string, BlockRenderer>>;
  className?: string;
  id?: string;
  'aria-label'?: string;
  /** What the editor's accessible description says, in place of the English way out. */
  hint?: string;
  /** The accessible name of the paragraph an empty document offers to type into. */
  paragraphLabel?: string;
  /** The accessible name of the hidden textbox that holds a selection across blocks. */
  selectedContentLabel?: string;
  /** The name of a block selected as a whole, such as an image's alt text, in place of `selectedContentLabel`. */
  blockLabel?: BlockLabel;
  /** The text and accessible name of a block whose type no renderer draws, in place of the English one. */
  unsupportedBlockLabel?: string;
  /** The accessible name of what a block draws in place of itself when its renderer throws. */
  blockErrorLabel?: string;
  /** Told of each error a block's renderer throws, besides React's own report of a caught error. */
  onBlockError?: (error: Error) => void;
  /** The text of the host an empty document draws. */
  placeholder?: string;
  /** The placeholder of each empty block, by default the name of a heading and nothing for other blocks. */
  blockPlaceholder?: BlockPlaceholder;
  /** What the live region says when blocks are selected, given how many it draws, in place of the English words. */
  blocksSelectedLabel?: (count: number) => string;
  /** Controls drawn over the blocks, such as a gutter, positioned against the editor's root. */
  children?: ReactNode;
};
```

[EditorViewProps on GitHub](src/view/react/EditorView.tsx#L19)

### useEditorState

```ts
function useEditorState<T>(
  controller: ViewController,
  selector: (state: EditorState) => T,
  isEqual?: (a: T, b: T) => boolean,
): T
```

[useEditorState on GitHub](src/view/react/use-editor-state.ts#L10)

### useQuoinEditor

The editor and the controller that binds it to the page, for a host that draws its own chrome around `EditorView`. The editor, its extensions and its render options are read once; the callbacks are read through a ref, so a new function identity on every render changes nothing.

```ts
function useQuoinEditor(options: UseQuoinEditorOptions): ViewController
```

[useQuoinEditor on GitHub](src/view/react/use-quoin-editor.ts#L26)

### UseQuoinEditorOptions

```ts
type UseQuoinEditorOptions = {
  blocks: QuoinBlock[];
  onChange: (blocks: QuoinBlock[]) => void;
  extensions?: readonly Extension[];
  readOnly?: boolean;
  onTransaction?: (tr: Transaction, state: EditorState) => void;
  onFiles?: (files: File[], at: Pos | null) => void;
  render?: RenderOptions;
};
```

[UseQuoinEditorOptions on GitHub](src/view/react/use-quoin-editor.ts#L9)

### useViewController

```ts
function useViewController(): ViewController
```

[useViewController on GitHub](src/view/react/editor-context.ts#L6)

## The controller

The object that binds an editor to the page: it dispatches transactions, holds the editable hosts and keeps the DOM in step.

### Announcer

```ts
type Announcer = {
  announce(message: string): void;
  current(): Spoken | null;
  subscribe(listener: () => void): () => void;
};
```

[Announcer on GitHub](src/view/controller/announcer.ts#L10)

### Engagement

```ts
type Engagement = {
  readonly engaged: boolean;
  engage(): void;
  subscribe(listener: () => void): () => void;
};
```

[Engagement on GitHub](src/view/controller/engagement.ts#L4)

### FocusTarget

```ts
type FocusTarget = Pos | 'start' | 'end';
```

[FocusTarget on GitHub](src/view/controller/focus-target.ts#L4)

### HostEntry

```ts
type HostEntry = { readonly block: string; readonly region: string; readonly element: HTMLElement };
```

[HostEntry on GitHub](src/view/controller/host-registry.ts#L1)

### hostKey

```ts
function hostKey(block: string, region: string): string
```

[hostKey on GitHub](src/view/controller/host-registry.ts#L10)

### HostRegistry

```ts
type HostRegistry = {
  register(block: string, region: string, element: HTMLElement): () => void;
  get(block: string, region: string): HTMLElement | undefined;
  locate(node: Node | null): HostEntry | null;
  all(): IterableIterator<HostEntry>;
};
```

[HostRegistry on GitHub](src/view/controller/host-registry.ts#L3)

### Spoken

```ts
type Spoken = {
  readonly message: string;
  readonly state: EditorState | undefined;
  readonly serial: number;
  readonly at: number;
};
```

[Spoken on GitHub](src/view/controller/announcer.ts#L3)

### ViewController

```ts
class ViewController {
  readonly editor: Editor;
  readonly registry: HostRegistry;
  readonly keyInterceptors: Set<KeyInterceptor>;
  readonly nodeReveal: NodeReveal;
  readonly announcer: Announcer;
  readonly engagement: Engagement;
  readonly isMac: boolean;
  readonly onFiles: ViewControllerOptions['onFiles'];
  goalX: number | null;
  nativeVerticalMove: boolean;
  dragging: boolean;
  composingKey: string | null;
  constructor(options: ViewControllerOptions);
  get root(): HTMLElement | null;
  get readOnly(): boolean;
  get sink(): HTMLElement | null;
  get emptyHost(): HTMLElement | null;
  attach(root: HTMLElement): () => void;
  registerBlockElement(id: string, element: HTMLElement): () => void;
  blockElement(id: string): HTMLElement | undefined;
  blockAt(node: Node): string | undefined;
  registerSink(element: HTMLElement): () => void;
  registerEmptyHost(element: HTMLElement): () => void;
  isEditorElement(element: Element): boolean;
  decorationsFor(block: string, region: string): readonly Decoration[];
  dispatch(tr: Transaction): void;
  edit(change: () => boolean): boolean;
  afterRender(): void;
  refreshHosts(): void;
  run(command: Command): boolean;
  announce(message: string): void;
  renderHost(block: string, region: string): void;
  domSelection(): globalThis.Selection | null;
  syncSelectionToDom(local?: boolean): void;
  readSelectionFromDom(): void;
  focus(target?: FocusTarget): void;
  setReadOnly(readOnly: boolean): void;
  subscribeReadOnly(listener: () => void): () => void;
  destroy(): void;
}
```

[ViewController on GitHub](src/view/controller/view-controller.ts#L36)

### ViewControllerOptions

```ts
type ViewControllerOptions = {
  editor: Editor;
  flush?: (fn: () => void) => void;
  render?: RenderOptions;
  onFiles?: (files: File[], at: Pos | null) => void;
  readOnly?: boolean;
  /** Which key is Mod. Defaults to the platform, as the editor's own isMac does, and must agree with it. */
  isMac?: boolean;
};
```

[ViewControllerOptions on GitHub](src/view/controller/view-controller.ts#L24)

## The DOM map

Inline nodes drawn into an element, and the map between a position in the document and a point in the DOM.

### AtomRenderer

```ts
type AtomRenderer = (node: AtomNode, doc: Document) => HTMLElement;
```

[AtomRenderer on GitHub](src/view/dom/render-options.ts#L3)

### DomMap

```ts
type DomMap = {
  readonly length: number;
  toDom(offset: number, assoc?: -1 | 1): DomPoint;
  fromDom(node: Node, offset: number): number | null;
};
```

[DomMap on GitHub](src/view/dom/dom-map.ts#L3)

### domMapOf

```ts
function domMapOf(host: HTMLElement): DomMap | undefined
```

[domMapOf on GitHub](src/view/dom/render-inline.ts#L16)

### DomPoint

```ts
type DomPoint = { node: Node; offset: number };
```

[DomPoint on GitHub](src/view/dom/dom-map.ts#L1)

### renderInline

```ts
function renderInline(
  host: HTMLElement,
  inline: Inline,
  decorations: readonly Decoration[],
  options?: RenderOptions,
): DomMap
```

[renderInline on GitHub](src/view/dom/render-inline.ts#L39)

### RenderOptions

```ts
type RenderOptions = {
  atoms?: Readonly<Record<string, AtomRenderer>>;
  widgets?: Readonly<Record<string, WidgetRenderer>>;
  atomText?: (node: AtomNode) => string;
};
```

[RenderOptions on GitHub](src/view/dom/render-options.ts#L6)

### WidgetRenderer

```ts
type WidgetRenderer = (decoration: Extract<Decoration, { kind: 'widget' }>, doc: Document) => HTMLElement;
```

[WidgetRenderer on GitHub](src/view/dom/render-options.ts#L4)

## Selection

What the view needs to tell a selection inside one block from one that crosses several.

### BlockLabel

What the editor calls a block selected as a whole, given the schema it can read the block's text with.

```ts
type BlockLabel = (block: EngineBlock, schema: Schema) => string;
```

[BlockLabel on GitHub](src/view/selection/selection-sink.ts#L73)

### NodeReveal

```ts
type NodeReveal = {
  /** Marks a block a press is selecting, which is under the pointer already. */
  pressed(block: string): void;
  /** Forgets the block shown once the selection leaves it, however it leaves, so coming back brings it into view. */
  follow(selection: Selection | null): void;
  /** Brings the block into view once; a change made here also brings in the block a settle left where it was. */
  show(selection: Selection | null, local?: boolean): void;
  /** Counts the block a selection holds as shown, and as owed to the next change made here if it was not shown yet. */
  settle(selection: Selection | null): void;
};
```

[NodeReveal on GitHub](src/view/selection/node-reveal.ts#L5)

## Keys

Where a host takes a key before the editor does.

### KeyInterceptor

```ts
type KeyInterceptor = (event: KeyboardEvent) => boolean;
```

[KeyInterceptor on GitHub](src/view/input/keydown.ts#L10)

## Caret placement

Where a point on the screen puts the caret, which the arrow keys and a pointer both ask for.

### caretFromPoint

```ts
function caretFromPoint(doc: Document, x: number, y: number): CaretPoint | null
```

[caretFromPoint on GitHub](src/view/navigation/caret-from-point.ts#L3)

### CaretPoint

```ts
type CaretPoint = { node: Node; offset: number };
```

[CaretPoint on GitHub](src/view/navigation/caret-from-point.ts#L1)
