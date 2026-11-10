---
title: Engine reference
description: Every export of quoin-editor/engine with its signature: the document, steps, commands, markdown and the editor.
---

# Engine reference

`quoin-editor/engine` is the editing engine on its own, with no React and no DOM. Every name it exports is listed here with the signature the published types carry, read from the package’s own source each time the site is built.

Nothing is held back. An entry of the package is a contract, so a name that should not be public should stop being exported rather than be left off this page. [Exports](https://quoincloud.com/docs/editor/api) says in prose what each entry of the package is for, and [Headless reference](https://quoincloud.com/docs/editor/headless-reference) lists what `quoin-editor/headless` adds on top of this one.

## The document

Blocks, the inline nodes inside them and the marks on those nodes: the shapes every other part reads and writes.

### atom

```ts
function atom(type: string, attrs: Attrs, marks?: readonly Mark[]): AtomNode
```

[atom on GitHub](src/engine/model/inline.ts#L12)

### AtomNode

```ts
type AtomNode = {
  readonly kind: 'atom';
  readonly type: string;
  readonly attrs: Attrs;
  readonly marks: readonly Mark[];
};
```

[AtomNode on GitHub](src/engine/model/types.ts#L8)

### Attrs

```ts
type Attrs = Readonly<Record<string, string>>;
```

[Attrs on GitHub](src/engine/model/types.ts#L3)

### BlockAttrs

```ts
type BlockAttrs = Readonly<Record<string, unknown>>;
```

[BlockAttrs on GitHub](src/engine/model/types.ts#L17)

### BlockRangeSelection

```ts
type BlockRangeSelection = { readonly kind: 'blocks'; readonly anchor: string; readonly head: string };
```

[BlockRangeSelection on GitHub](src/engine/model/types.ts#L37)

### EngineBlock

```ts
type EngineBlock = {
  readonly id: string;
  readonly type: string;
  readonly indent: number;
  readonly attrs: BlockAttrs;
  readonly regions: Readonly<Record<string, Inline>>;
};
```

[EngineBlock on GitHub](src/engine/model/types.ts#L19)

### EngineDoc

```ts
type EngineDoc = {
  readonly blocks: readonly EngineBlock[];
  readonly index: ReadonlyMap<string, number>;
};
```

[EngineDoc on GitHub](src/engine/model/types.ts#L27)

### Inline

```ts
type Inline = readonly InlineNode[];
```

[Inline on GitHub](src/engine/model/types.ts#L15)

### InlineNode

```ts
type InlineNode = TextNode | AtomNode;
```

[InlineNode on GitHub](src/engine/model/types.ts#L14)

### Mark

```ts
type Mark = { readonly type: string; readonly attrs?: Attrs };
```

[Mark on GitHub](src/engine/model/types.ts#L5)

### NodeSelection

```ts
type NodeSelection = { readonly kind: 'node'; readonly block: string };
```

[NodeSelection on GitHub](src/engine/model/types.ts#L36)

### normalizeInline

```ts
function normalizeInline(nodes: readonly InlineNode[]): Inline
```

[normalizeInline on GitHub](src/engine/model/inline.ts#L30)

### Pos

```ts
type Pos = { readonly block: string; readonly region: string; readonly offset: number };
```

[Pos on GitHub](src/engine/model/types.ts#L32)

### QuoinBlock

A document is an ordered array of these; `type` is looked up in the registered block definitions.

```ts
type QuoinBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  /** Nesting depth shared by every block type, such as list nesting and toggle children; 0 when absent. */
  indent?: number;
};
```

[QuoinBlock on GitHub](src/engine/model/quoin-block.ts#L2)

### Selection

```ts
type Selection = TextSelection | NodeSelection | BlockRangeSelection;
```

[Selection on GitHub](src/engine/model/types.ts#L38)

### text

```ts
function text(value: string, marks?: readonly Mark[]): TextNode
```

[text on GitHub](src/engine/model/inline.ts#L8)

### TextNode

```ts
type TextNode = { readonly kind: 'text'; readonly text: string; readonly marks: readonly Mark[] };
```

[TextNode on GitHub](src/engine/model/types.ts#L7)

### TextSelection

`assoc: -1` draws a caret at a soft wrap at the end of the line before it.

```ts
type TextSelection = { readonly kind: 'text'; readonly anchor: Pos; readonly head: Pos; readonly assoc?: Assoc };
```

[TextSelection on GitHub](src/engine/model/types.ts#L35)

## The schema

What types of block, mark and atom a document may hold, and how each is read from and written back to markdown.

### AtomSpec

```ts
type AtomSpec = {
  readonly type: string;
  plainText(attrs: Attrs): string;
};
```

[AtomSpec on GitHub](src/engine/schema/types.ts#L51)

### BlockContent

```ts
type BlockContent = { attrs: BlockAttrs; regions: Record<string, Inline> };
```

[BlockContent on GitHub](src/engine/schema/types.ts#L24)

### BlockFlow

```ts
type BlockFlow = 'text' | 'void' | 'structured';
```

[BlockFlow on GitHub](src/engine/schema/types.ts#L26)

### BlockSpec

```ts
type BlockSpec = {
  readonly type: string;
  readonly flow: BlockFlow;
  readonly primaryRegion?: string;
  readonly enter?: 'split' | 'hardBreak';
  fromData(data: Record<string, unknown>, ctx: CodecContext): BlockContent;
  toData(block: EngineBlock, ctx: CodecContext): Record<string, unknown>;
  initial(): BlockContent;
  splitAttrs?(attrs: BlockAttrs): { type: string; attrs: BlockAttrs };
  toMarkdown?(block: EngineBlock, ctx: MarkdownExportContext): string;
  toPlainText?(block: EngineBlock): string;
};
```

[BlockSpec on GitHub](src/engine/schema/types.ts#L33)

### CodecContext

```ts
type CodecContext = {
  readonly inline: InlineCodec;
  newId(): string;
};
```

[CodecContext on GitHub](src/engine/schema/types.ts#L19)

### createSchema

```ts
function createSchema(input?: SchemaInput): Schema
```

[createSchema on GitHub](src/engine/schema/create-schema.ts#L16)

### InlineCodec

```ts
type InlineCodec = {
  parse(markdown: string, options?: ParseInlineOptions): Inline;
  serialize(inline: Inline, options?: SerializeInlineOptions): string;
};
```

[InlineCodec on GitHub](src/engine/schema/types.ts#L14)

### MarkdownExportContext

```ts
type MarkdownExportContext = CodecContext & {
  resolveAssetUrl(storageKey: string): string;
  comments: boolean;
};
```

[MarkdownExportContext on GitHub](src/engine/schema/types.ts#L28)

### MarkSpec

```ts
type MarkSpec = {
  readonly type: string;
  readonly inclusive: boolean;
};
```

[MarkSpec on GitHub](src/engine/schema/types.ts#L46)

### ParseInlineOptions

```ts
type ParseInlineOptions = {
  softBreak?: 'newline' | 'space';
  refs?: ReadonlyMap<string, { href: string; title?: string }>;
};
```

[ParseInlineOptions on GitHub](src/engine/schema/types.ts#L3)

### Schema

```ts
type Schema = {
  readonly blocks: ReadonlyMap<string, BlockSpec>;
  readonly marks: ReadonlyMap<string, MarkSpec>;
  readonly atoms: ReadonlyMap<string, AtomSpec>;
  readonly defaultTextBlock: string;
};
```

[Schema on GitHub](src/engine/schema/types.ts#L56)

### SchemaInput

```ts
type SchemaInput = {
  blocks?: BlockSpec[];
  marks?: MarkSpec[];
  atoms?: AtomSpec[];
  defaultTextBlock?: string;
};
```

[SchemaInput on GitHub](src/engine/schema/create-schema.ts#L6)

### SerializeInlineOptions

```ts
type SerializeInlineOptions = {
  escapeLineStart?: boolean;
  escapePipes?: boolean;
  hardBreak?: 'backslash' | 'br';
};
```

[SerializeInlineOptions on GitHub](src/engine/schema/types.ts#L8)

## Blocks and the codec

The block types every document starts with, and the translation between stored blocks and the tree the engine edits.

### Align

```ts
type Align = 'left' | 'center' | 'right' | 'justify';
```

[Align on GitHub](src/engine/blocks/data-fields.ts#L7)

### BlockCodec

```ts
type BlockCodec = {
  /** `taken` holds the ids of the other blocks of the document, which a split piece never takes. */
  toEngineBlocks(block: QuoinBlock, taken?: ReadonlySet<string>): EngineBlock[];
  toQuoin(block: EngineBlock): QuoinBlock;
  docFromBlocks(blocks: readonly QuoinBlock[]): EngineDoc;
  blocksFromDoc(doc: EngineDoc): QuoinBlock[];
  context: CodecContext;
};
```

[BlockCodec on GitHub](src/engine/blocks/codec.ts#L13)

### coreBlockSpecs

```ts
const coreBlockSpecs: BlockSpec[]
```

[coreBlockSpecs on GitHub](src/engine/blocks/core-specs.ts#L15)

### createBlockCodec

```ts
function createBlockCodec(schema: Schema, options?: { newId?: () => string }): BlockCodec
```

[createBlockCodec on GitHub](src/engine/blocks/codec.ts#L26)

## Steps

The smallest changes a document takes. Commands are built from them, history inverts them, and a collaboration adapter sends them over the wire.

### addMarkStep

```ts
function addMarkStep(block: string, region: string, from: number, to: number, mark: Mark): Step
```

[addMarkStep on GitHub](src/engine/transform/mark-steps.ts#L50)

### Assoc

```ts
type Assoc = -1 | 1;
```

[Assoc on GitHub](src/engine/transform/step.ts#L3)

### AttrsPatch

```ts
type AttrsPatch = Readonly<Record<string, unknown>>;
```

[AttrsPatch on GitHub](src/engine/transform/attrs-steps.ts#L7)

### CreatedBlock

```ts
type CreatedBlock = {
  id: string;
  type: string;
  attrs: BlockAttrs;
  indent: number;
  region: string;
  regions?: Record<string, Inline>;
};
```

[CreatedBlock on GitHub](src/engine/transform/step.ts#L17)

### insertBlocksStep

```ts
function insertBlocksStep(index: number, blocks: readonly EngineBlock[]): Step
```

[insertBlocksStep on GitHub](src/engine/transform/block-steps.ts#L8)

### joinBlocksStep

```ts
function joinBlocksStep(
  target: string,
  targetRegion: string,
  source: string,
  sourceRegion: string,
): Step
```

[joinBlocksStep on GitHub](src/engine/transform/split-join-steps.ts#L34)

### moveBlocksStep

```ts
function moveBlocksStep(from: number, count: number, to: number): Step
```

[moveBlocksStep on GitHub](src/engine/transform/block-steps.ts#L46)

### PosMap

```ts
type PosMap = (pos: Pos, assoc?: Assoc) => Pos;
```

[PosMap on GitHub](src/engine/transform/step.ts#L4)

### removeBlocksStep

```ts
function removeBlocksStep(index: number, count: number): Step
```

[removeBlocksStep on GitHub](src/engine/transform/block-steps.ts#L25)

### removeMarkStep

```ts
function removeMarkStep(
  block: string,
  region: string,
  from: number,
  to: number,
  mark: Mark | string,
): Step
```

[removeMarkStep on GitHub](src/engine/transform/mark-steps.ts#L54)

### replaceBlockStep

```ts
function replaceBlockStep(block: EngineBlock): Step
```

[replaceBlockStep on GitHub](src/engine/transform/block-steps.ts#L66)

### replaceDocStep

```ts
function replaceDocStep(next: EngineDoc): Step
```

[replaceDocStep on GitHub](src/engine/transform/replace-doc-step.ts#L8)

### replaceInlineStep

```ts
function replaceInlineStep(
  block: string,
  region: string,
  from: number,
  to: number,
  slice: Inline,
): Step
```

[replaceInlineStep on GitHub](src/engine/transform/replace-inline-step.ts#L7)

### setAttrsStep

```ts
function setAttrsStep(block: string, patch: AttrsPatch): Step
```

[setAttrsStep on GitHub](src/engine/transform/attrs-steps.ts#L43)

### setIndentStep

```ts
function setIndentStep(block: string, indent: number): Step
```

[setIndentStep on GitHub](src/engine/transform/attrs-steps.ts#L55)

### splitBlockStep

```ts
function splitBlockStep(
  block: string,
  region: string,
  offset: number,
  created: CreatedBlock,
): Step
```

[splitBlockStep on GitHub](src/engine/transform/split-join-steps.ts#L7)

### Step

```ts
interface Step {
  readonly stepType: string;
  apply(doc: EngineDoc): StepResult;
  invert(before: EngineDoc): Step;
  toJSON(): StepJSON;
}
```

[Step on GitHub](src/engine/transform/step.ts#L8)

### stepFromJSON

```ts
function stepFromJSON(json: StepJSON): Step
```

[stepFromJSON on GitHub](src/engine/transform/step-json.ts#L48)

### StepJSON

```ts
type StepJSON = { readonly stepType: string } & Readonly<Record<string, unknown>>;
```

[StepJSON on GitHub](src/engine/transform/step.ts#L6)

### StepResult

```ts
type StepResult = { doc: EngineDoc; map: PosMap };
```

[StepResult on GitHub](src/engine/transform/step.ts#L5)

## State, transactions and plugins

The state a view draws, the transaction that carries steps and a selection into the next state, and the plugins that watch both.

### applyTransaction

```ts
function applyTransaction(state: EditorState, tr: Transaction): EditorState
```

[applyTransaction on GitHub](src/engine/state/editor-state.ts#L47)

### blockRangeSelection

```ts
function blockRangeSelection(anchor: string, head?: string): BlockRangeSelection
```

[blockRangeSelection on GitHub](src/engine/state/selection.ts#L26)

### createPluginKey

```ts
function createPluginKey<T>(name: string): PluginKey<T>
```

[createPluginKey on GitHub](src/engine/state/plugin.ts#L6)

### createState

```ts
function createState(config: { doc: EngineDoc; schema: Schema; selection?: Selection | null; plugins?: readonly PluginSpec<unknown>[]; clock?: () => number; }): EditorState
```

[createState on GitHub](src/engine/state/editor-state.ts#L18)

### EditorState

```ts
type EditorState = {
  readonly doc: EngineDoc;
  readonly selection: Selection | null;
  readonly storedMarks: readonly Mark[] | null;
  readonly schema: Schema;
  readonly plugins: readonly PluginSpec<unknown>[];
  readonly pluginState: ReadonlyMap<string, unknown>;
  readonly clock: () => number;
};
```

[EditorState on GitHub](src/engine/state/editor-state.ts#L8)

### getPluginState

```ts
function getPluginState<T>(state: EditorState, key: PluginKey<T>): T
```

[getPluginState on GitHub](src/engine/state/editor-state.ts#L63)

### nodeSelection

```ts
function nodeSelection(block: string): NodeSelection
```

[nodeSelection on GitHub](src/engine/state/selection.ts#L22)

### PluginKey

```ts
type PluginKey<T> = { readonly name: string; readonly __value?: T };
```

[PluginKey on GitHub](src/engine/state/plugin.ts#L4)

### PluginSpec

```ts
type PluginSpec<T> = {
  readonly key: PluginKey<T>;
  init(state: EditorState): T;
  apply(tr: Transaction, value: T, oldState: EditorState, newState: EditorState): T;
};
```

[PluginSpec on GitHub](src/engine/state/plugin.ts#L10)

### redo

```ts
const redo: Command
```

[redo on GitHub](src/engine/state/history.ts#L161)

### textSelection

```ts
function textSelection(anchor: Pos, head?: Pos): TextSelection
```

[textSelection on GitHub](src/engine/state/selection.ts#L18)

### Transaction

```ts
class Transaction {
  readonly before: EditorState;
  readonly time: number;
  constructor(state: EditorState, time?: number);
  get doc(): EngineDoc;
  get docs(): readonly EngineDoc[];
  get steps(): readonly Step[];
  get maps(): readonly PosMap[];
  get docChanged(): boolean;
  get selection(): Selection | null;
  get selectionSet(): boolean;
  get storedMarks(): readonly Mark[] | null;
  get storedMarksSet(): boolean;
  get meta(): ReadonlyMap<string, unknown>;
  get origin(): TransactionOrigin;
  get addToHistory(): boolean;
  step(step: Step): this;
  maybeStep(step: Step): boolean;
  setSelection(selection: Selection | null): this;
  setStoredMarks(marks: readonly Mark[] | null): this;
  setOrigin(origin: TransactionOrigin): this;
  setMeta(key: string, value: unknown): this;
  getMeta<T>(key: string): T | undefined;
  mapPos(pos: Pos, assoc?: Assoc, fromStep?: number): Pos;
}
```

[Transaction on GitHub](src/engine/state/transaction.ts#L14)

### TransactionOrigin

```ts
type TransactionOrigin = 'input' | 'command' | 'paste' | 'drop' | 'remote' | 'reconcile' | 'ai' | 'history';
```

[TransactionOrigin on GitHub](src/engine/state/transaction.ts#L6)

### undo

```ts
const undo: Command
```

[undo on GitHub](src/engine/state/history.ts#L160)

## Commands

A command reads the state and either reports that it would apply or dispatches a transaction that applies it.

### BlockStructureOptions

```ts
type BlockStructureOptions = { newId?: () => string };
```

[BlockStructureOptions on GitHub](src/engine/commands/block-structure.ts#L29)

### BoundCommands

```ts
type BoundCommands<F extends CommandFactories> = { [K in keyof F]: (...args: Parameters<F[K]>) => boolean };
```

[BoundCommands on GitHub](src/engine/commands/chain.ts#L45)

### Chain

```ts
type Chain<F extends CommandFactories> = {
  [K in keyof F]: (...args: Parameters<F[K]>) => Chain<F>;
} & { run(): boolean };
```

[Chain on GitHub](src/engine/commands/chain.ts#L47)

### Command

```ts
type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
```

[Command on GitHub](src/engine/commands/command.ts#L4)

### CommandFactories

```ts
type CommandFactories = Readonly<Record<string, (...args: never[]) => Command>>;
```

[CommandFactories on GitHub](src/engine/commands/chain.ts#L43)

### insertBlockAfter

```ts
function insertBlockAfter(
  type: string,
  attrs?: BlockAttrs,
  options?: BlockStructureOptions,
): Command
```

[insertBlockAfter on GitHub](src/engine/commands/block-structure.ts#L135)

### insertText

Inserts `value` at the selection, in place of any selected text or blocks, as a command an extension can return. It is an undo step of its own unless `options.origin` is `input`, which groups it with the typing around it.

```ts
function insertText(value: string, options?: InsertTextOptions): Command
```

[insertText on GitHub](src/engine/commands/insert-text.ts#L36)

### InsertTextOptions

```ts
type InsertTextOptions = { origin?: TransactionOrigin; newId?: () => string };
```

[InsertTextOptions on GitHub](src/engine/commands/insert-text.ts#L13)

### setBlockType

```ts
function setBlockType(type: string, attrs?: BlockAttrs): Command
```

[setBlockType on GitHub](src/engine/commands/turn-into.ts#L50)

### toggleMark

```ts
function toggleMark(type: string, attrs?: Attrs): Command
```

[toggleMark on GitHub](src/engine/commands/marks.ts#L78)

## Input rules

What typing turns into as it is typed, such as a heading from a hash and a space, or a dash pair into a dash.

### blockInputRules

```ts
const blockInputRules: readonly InputRule[]
```

[blockInputRules on GitHub](src/engine/rules/block-rules.ts#L52)

### InputRule

```ts
type InputRule = {
  readonly name: string;
  readonly match: RegExp;
  readonly blockTypes?: readonly string[];
  readonly kinds?: readonly string[];
  handler(
    state: EditorState,
    match: RegExpExecArray,
    range: InputRuleRange,
    context?: InputRuleContext,
  ): Transaction | null;
};
```

[InputRule on GitHub](src/engine/rules/input-rule.ts#L16)

### InputRuleContext

```ts
type InputRuleContext = { readonly newId: () => string };
```

[InputRuleContext on GitHub](src/engine/rules/input-rule.ts#L14)

### InputRuleRange

```ts
type InputRuleRange = { block: string; region: string; from: number; to: number };
```

[InputRuleRange on GitHub](src/engine/rules/input-rule.ts#L12)

### insertTextWithRules

```ts
function insertTextWithRules(
  value: string,
  rules: readonly InputRule[],
  options?: { newId?: () => string },
): Command
```

[insertTextWithRules on GitHub](src/engine/rules/input-rule.ts#L57)

### markInputRules

```ts
const markInputRules: readonly InputRule[]
```

[markInputRules on GitHub](src/engine/rules/mark-rules.ts#L10)

### typographyRules

```ts
function typographyRules(options?: { dashes?: 'em' | 'en' | 'none' }): readonly InputRule[]
```

[typographyRules on GitHub](src/engine/rules/typography.ts#L32)

## The clipboard

HTML a reader pastes, read into blocks, and the slice of a document a copy carries.

### DOMParserLike

```ts
type DOMParserLike = { parseFromString(html: string, type: 'text/html'): { readonly body: object } };
```

[DOMParserLike on GitHub](src/engine/clipboard/from-html.ts#L7)

### fromHTML

```ts
function fromHTML(html: string, options?: FromHTMLOptions): QuoinBlock[]
```

[fromHTML on GitHub](src/engine/clipboard/from-html.ts#L16)

### FromHTMLOptions

```ts
type FromHTMLOptions = { parser?: DOMParserLike; newId?: () => string };
```

[FromHTMLOptions on GitHub](src/engine/clipboard/from-html.ts#L9)

### Slice

```ts
type Slice = {
  readonly blocks: readonly QuoinBlock[];
  readonly openStart: boolean;
  readonly openEnd: boolean;
  /** Read from plain text: its first line takes the type of an empty block it is pasted into. */
  readonly plainText?: boolean;
};
```

[Slice on GitHub](src/engine/clipboard/slice.ts#L3)

## Markdown in and out

The parser and the serialiser that make markdown the storage format, for whole documents and for inline runs.

### fromMarkdown

A markdown file read back into blocks, one text block per line, ready to pass to the canvas as `blocks`.

```ts
function fromMarkdown(markdown: string, options?: FromMarkdownOptions): QuoinBlock[]
```

[fromMarkdown on GitHub](src/engine/markdown/block/from-markdown.ts#L9)

### FromMarkdownOptions

```ts
type FromMarkdownOptions = { softBreak?: 'newline' | 'space'; newId?: () => string };
```

[FromMarkdownOptions on GitHub](src/engine/markdown/block/from-markdown.ts#L6)

### PALETTE

The colour names a writer can pick for text and for a background, each a `--quoin-color-*` token.

```ts
const PALETTE: readonly ["default", "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"]
```

[PALETTE on GitHub](src/engine/markdown/palette.ts#L2)

### parseInline

```ts
function parseInline(markdown: string, options?: ParseInlineOptions): Inline
```

[parseInline on GitHub](src/engine/markdown/inline/parse-inline.ts#L139)

### sanitizeHref

```ts
function sanitizeHref(href: string): string | null
```

[sanitizeHref on GitHub](src/engine/markdown/urls.ts#L14)

### serializeInline

```ts
function serializeInline(inline: Inline, options?: SerializeInlineOptions): string
```

[serializeInline on GitHub](src/engine/markdown/inline/serialize-inline.ts#L7)

### toMarkdown

A whole document as one markdown file, each block spelled as the lines it is stored as.

```ts
function toMarkdown(blocks: readonly QuoinBlock[], options?: ToMarkdownOptions): string
```

[toMarkdown on GitHub](src/engine/markdown/document/to-markdown.ts#L90)

### ToMarkdownOptions

```ts
type ToMarkdownOptions = {
  schema?: Schema;
  resolveAssetUrl?: (storageKey: string) => string;
  comments?: boolean;
  /**
   * Write every block that markdown cannot hold in full as a quoin comment, so that fromMarkdown reads back all of its
   * data. Plain export, the default, writes native markdown and drops what that form cannot carry: block-level align,
   * colour, background and other extra keys, the indent no container explains, and the data of the other block types.
   */
  lossless?: boolean;
};
```

[ToMarkdownOptions on GitHub](src/engine/markdown/document/to-markdown.ts#L12)

## Rendering a document out

A document as HTML, as plain text or as counts, with no editor and no DOM.

### countDoc

Counts a document from per-block counts kept for each block object, so a keystroke recounts one block.

```ts
function countDoc(doc: EngineDoc, options?: { schema?: Schema }): TextStats
```

[countDoc on GitHub](src/engine/render/count-text.ts#L27)

### countText

```ts
function countText(blocks: readonly QuoinBlock[], options?: { schema?: Schema }): TextStats
```

[countText on GitHub](src/engine/render/count-text.ts#L21)

### EmbedProvider

```ts
type EmbedProvider = {
  readonly name: string;
  /** Returns the https address of the frame for a page this provider embeds, or null for any other page. */
  match(url: EmbedUrl): string | null;
};
```

[EmbedProvider on GitHub](src/engine/render/embed-provider.ts#L12)

### EmbedUrl

The parts of a URL that a provider reads. A WHATWG `URL` fits, and the declarations need no DOM types.

```ts
type EmbedUrl = {
  readonly href: string;
  readonly protocol: string;
  readonly hostname: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly searchParams: { get(name: string): string | null };
};
```

[EmbedUrl on GitHub](src/engine/render/embed-provider.ts#L2)

### HTMLOptions

```ts
type HTMLOptions = {
  schema?: Schema;
  /** The address of a stored picture or file. One that is no http, https, blob, data or relative address is left out. */
  resolveAssetUrl?: (storageKey: string) => string;
  renderMath?: (latex: string, options: { displayMode: boolean }) => string;
  embeds?: 'iframe' | 'link';
  /** Tried before the built in providers, in order. Only used when `embeds` is `'iframe'`. */
  embedProviders?: readonly EmbedProvider[];
  /** The title of a frame given its provider's name, the name itself by default. */
  frameTitle?: (provider: string) => string;
  /** The accessible name of a task checkbox whose item has no text, `'Task'` by default. */
  taskLabel?: string;
};
```

[HTMLOptions on GitHub](src/engine/render/to-html.ts#L7)

### TextStats

```ts
type TextStats = { characters: number; words: number };
```

[TextStats on GitHub](src/engine/render/count-block.ts#L6)

### toHTML

A whole document as HTML, for a page, an email or a feed. It loads no React and needs no DOM.

```ts
function toHTML(blocks: readonly QuoinBlock[], options?: HTMLOptions): string
```

[toHTML on GitHub](src/engine/render/to-html.ts#L22)

### toPlainText

A whole document as plain text, its markup dropped, for a search index, a summary or a word count.

```ts
function toPlainText(blocks: readonly QuoinBlock[], options?: { schema?: Schema }): string
```

[toPlainText on GitHub](src/engine/render/to-plain-text.ts#L12)

## Differences between documents

What changed between two versions, block by block and within a block, for a diff view or a review.

### BlockChange

```ts
type BlockChange = {
  op: 'change';
  before: QuoinBlock;
  after: QuoinBlock;
  regions: Record<string, InlineChange[]>;
  attrsChanged: boolean;
};
```

[BlockChange on GitHub](src/engine/diff/block-change.ts#L8)

### BlockDiff

A moved block is deleted where it was and inserted where it went, its insertion holding its `change` if edited.

```ts
type BlockDiff =
  | { op: 'equal'; block: QuoinBlock }
  | { op: 'insert'; block: QuoinBlock; moved?: boolean; change?: BlockChange }
  | { op: 'delete'; block: QuoinBlock; moved?: boolean }
  | BlockChange;
```

[BlockDiff on GitHub](src/engine/diff/diff-blocks.ts#L10)

### diffBlocks

A 0.4 block that holds several nodes is diffed as the pieces the editor splits it into, so an edit shows in one piece only, and the diff then carries those pieces. Blocks that are the same on both sides are never split.

```ts
function diffBlocks(
  a: readonly QuoinBlock[],
  b: readonly QuoinBlock[],
  options?: { schema?: Schema },
): BlockDiff[]
```

[diffBlocks on GitHub](src/engine/diff/diff-blocks.ts#L28)

### diffInline

```ts
function diffInline(a: Inline, b: Inline): InlineChange[]
```

[diffInline on GitHub](src/engine/diff/diff-inline.ts#L8)

### InlineChange

```ts
type InlineChange = { op: 'equal' | 'insert' | 'delete'; inline: Inline };
```

[InlineChange on GitHub](src/engine/diff/diff-inline.ts#L6)

## Extensions and the editor

An extension adds commands, keys, rules and plugins; the editor is the set of them, resolved and bound to a state.

### CoreCommands

```ts
type CoreCommands = typeof coreCommands;
```

[CoreCommands on GitHub](src/engine/extension/core-extensions.ts#L24)

### CoreExtensionOptions

```ts
type CoreExtensionOptions = {
  typography?: { dashes?: 'em' | 'en' | 'none' } | false;
  newId?: () => string;
};
```

[CoreExtensionOptions on GitHub](src/engine/extension/core-extensions.ts#L26)

### coreExtensions

```ts
function coreExtensions(options?: CoreExtensionOptions): Extension[]
```

[coreExtensions on GitHub](src/engine/extension/core-extensions.ts#L36)

### createEditor

The editing engine on its own, with no React and no DOM, for a host that drives it itself or runs it on a server.

```ts
function createEditor<F extends CommandFactories = CoreCommands>(options: EditorOptions): Editor<F>
```

[createEditor on GitHub](src/engine/extension/editor.ts#L77)

### Decoration

```ts
type Decoration =
  | {
      readonly kind: 'inline';
      readonly block: string;
      readonly region: string;
      readonly from: number;
      readonly to: number;
      readonly attrs: Attrs;
    }
  | {
      readonly kind: 'widget';
      readonly block: string;
      readonly region: string;
      readonly offset: number;
      readonly key: string;
      readonly widget: string;
      readonly attrs: Attrs;
      readonly side?: -1 | 1;
    }
  /** Attributes written on the element of a whole block: `data-*` and `aria-*` names only. */
  | { readonly kind: 'block'; readonly block: string; readonly attrs: Attrs };
```

[Decoration on GitHub](src/engine/extension/types.ts#L12)

### defineExtension

```ts
function defineExtension<E extends Extension>(extension: E): E
```

[defineExtension on GitHub](src/engine/extension/define-extension.ts#L3)

### Editor

```ts
type Editor<F extends CommandFactories = CoreCommands> = {
  readonly state: EditorState;
  readonly schema: Schema;
  dispatch(tr: Transaction): void;
  createTransaction(): Transaction;
  subscribe(listener: (state: EditorState, tr: Transaction | null) => void): () => void;
  readonly commands: BoundCommands<F>;
  chain(): Chain<F>;
  can(): BoundCommands<F>;
  isActive(name: string, attrs?: Record<string, unknown>): boolean;
  insertText(text: string): boolean;
  handleKey(event: KeyLike): boolean;
  paste(data: { json?: string; html?: string; text?: string }, parser?: DOMParserLike): boolean;
  copy(): { json: string; html: string; text: string } | null;
  getBlocks(): QuoinBlock[];
  setBlocks(blocks: readonly QuoinBlock[]): boolean;
  /** Runs the extensions' `onMount`, as a view does when it attaches; returns the means to end that mount. */
  mount(): () => void;
  decorations(): readonly Decoration[];
  toMarkdown(options?: MarkdownOptions): string;
  stats(): TextStats;
  destroy(): void;
};
```

[Editor on GitHub](src/engine/extension/editor.ts#L44)

### EditorOptions

```ts
type EditorOptions = {
  blocks: readonly QuoinBlock[];
  extensions?: readonly Extension[];
  onChange?: (blocks: QuoinBlock[]) => void;
  onTransaction?: (tr: Transaction, state: EditorState) => void;
  newId?: () => string;
  now?: () => number;
  isMac?: boolean;
  /** Turns a storage key into the url written for IMAGE and FILE blocks in copies and, by default, in toMarkdown. */
  resolveAssetUrl?: (key: string) => string;
};
```

[EditorOptions on GitHub](src/engine/extension/editor.ts#L25)

### Extension

```ts
type Extension = {
  readonly name: string;
  readonly priority?: number;
  readonly blocks?: readonly BlockSpec[];
  readonly marks?: readonly MarkSpec[];
  readonly atoms?: readonly AtomSpec[];
  readonly inputRules?: readonly InputRule[];
  readonly pasteRules?: readonly PasteRule[];
  readonly keymap?: Readonly<Record<string, Command>>;
  readonly commands?: CommandFactories;
  readonly plugins?: readonly PluginSpec<unknown>[];
  readonly decorations?: (state: EditorState) => readonly Decoration[];
  readonly onTransaction?: (tr: Transaction, state: EditorState) => void;
  /**
   * Refuses a transaction before it applies by returning false: the editor drops it whole. Undo and redo, the undo of an
   * input rule, the blocks the host supplies and remote transactions are never filtered.
   */
  readonly filterTransaction?: (tr: Transaction, state: EditorState) => boolean;
  /** Returns false to refuse blocks the host supplies that differ from the document, which then stays as it is. */
  readonly filterHostBlocks?: (blocks: readonly QuoinBlock[], state: EditorState) => boolean;
  /** Runs on each `editor.mount()`; what it returns runs when that mount ends or the editor is destroyed. */
  readonly onMount?: (editor: Editor<CommandFactories>) => (() => void) | void;
  readonly ui?: unknown;
};
```

[Extension on GitHub](src/engine/extension/types.ts#L36)

### KeyLike

```ts
type KeyLike = {
  key: string;
  code?: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};
```

[KeyLike on GitHub](src/engine/extension/keymap.ts#L5)

### keyName

```ts
function keyName(event: KeyLike, isMac: boolean): string
```

[keyName on GitHub](src/engine/extension/keymap.ts#L50)

### MarkdownOptions

```ts
type MarkdownOptions = {
  comments?: boolean;
  /** Write what markdown cannot hold as quoin comments. Plain export drops block-level extras and other data. */
  lossless?: boolean;
  resolveAssetUrl?: (key: string) => string;
};
```

[MarkdownOptions on GitHub](src/engine/extension/editor.ts#L37)

### normalizeKey

```ts
function normalizeKey(name: string, isMac: boolean): string
```

[normalizeKey on GitHub](src/engine/extension/keymap.ts#L30)

### PasteRule

```ts
type PasteRule = { readonly name: string; match(text: string, state: EditorState): Command | null };
```

[PasteRule on GitHub](src/engine/extension/types.ts#L34)
