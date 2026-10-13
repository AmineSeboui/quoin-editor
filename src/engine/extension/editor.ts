import { createBlockCodec, type BlockCodec } from '../blocks/codec';
import { sliceToClipboard } from '../clipboard/serialize-slice';
import { insertSlice } from '../clipboard/insert-slice';
import { sliceFromSelection } from '../clipboard/extract-slice';
import type { DOMParserLike } from '../clipboard/from-html';
import { sliceFromClipboard } from '../clipboard/slice-from-clipboard';
import { createCommandHelpers, type BoundCommands, type Chain, type CommandFactories } from '../commands/chain';
import { isActive } from '../commands/is-active';
import { toMarkdown } from '../markdown/document/to-markdown';
import type { QuoinBlock } from '../model/quoin-block';
import { sameDoc } from '../model/same-doc';
import type { EngineDoc } from '../model/types';
import { insertTextWithRules } from '../rules/input-rule';
import type { Schema } from '../schema/types';
import { applyTransaction, createState, type EditorState } from '../state/editor-state';
import { Transaction } from '../state/transaction';
import { replaceDocStep } from '../transform/replace-doc-step';
import { coreExtensions, type CoreCommands } from './core-extensions';
import { detectMac } from './detect-mac';
import { createEchoTracker } from './echo-tracker';
import { runKeymap, type KeyLike } from './keymap';
import { resolveExtensions } from './resolve-extensions';
import { sameBlocks } from './same-blocks';
import type { Decoration, Extension, ResolvedExtensions } from './types';

export type EditorOptions = {
  blocks: readonly QuoinBlock[];
  extensions?: readonly Extension[];
  onChange?: (blocks: QuoinBlock[]) => void;
  onTransaction?: (tr: Transaction, state: EditorState) => void;
  newId?: () => string;
  now?: () => number;
  isMac?: boolean;
};

export type MarkdownOptions = { comments?: boolean; lossless?: boolean; resolveAssetUrl?: (key: string) => string };

export type Editor<F extends CommandFactories = CoreCommands> = {
  readonly state: EditorState;
  readonly schema: Schema;
  readonly resolved: ResolvedExtensions;
  readonly codec: BlockCodec;
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
  decorations(): readonly Decoration[];
  toMarkdown(options?: MarkdownOptions): string;
  destroy(): void;
};

type Listener = (state: EditorState, tr: Transaction | null) => void;

export function createEditor<F extends CommandFactories = CoreCommands>(options: EditorOptions): Editor<F> {
  const { newId, onChange } = options;
  const isMac = options.isMac ?? detectMac();
  const now = options.now ?? Date.now;
  const resolved = resolveExtensions(options.extensions ?? coreExtensions({ newId }), isMac);
  const { schema } = resolved;
  const codec = createBlockCodec(schema, { newId });
  const tracker = createEchoTracker();
  const listeners = new Set<Listener>();
  const quiet = new WeakSet<Transaction>();
  const dispatched = new WeakSet<Transaction>();
  let state = createState({ doc: codec.docFromBlocks(options.blocks), schema, plugins: resolved.plugins });
  let supplied: readonly QuoinBlock[] = options.blocks;
  let converted: { doc: EngineDoc; blocks: QuoinBlock[] } | null = null;
  let destroyed = false;

  function getBlocks(): QuoinBlock[] {
    if (converted?.doc !== state.doc) converted = { doc: state.doc, blocks: codec.blocksFromDoc(state.doc) };
    return converted.blocks;
  }

  function dispatch(tr: Transaction): void {
    if (destroyed) return;
    if (dispatched.has(tr)) throw new RangeError('This transaction was already dispatched');
    state = applyTransaction(state, tr);
    dispatched.add(tr);
    for (const listener of [...listeners]) listener(state, tr);
    for (const extension of resolved.extensions) extension.onTransaction?.(tr, state);
    options.onTransaction?.(tr, state);
    if (!tr.docChanged || quiet.has(tr)) return;
    const blocks = getBlocks();
    tracker.emitted(blocks);
    onChange?.(blocks);
  }

  function setBlocks(incoming: readonly QuoinBlock[]): boolean {
    const previous = supplied;
    supplied = incoming;
    if (incoming === previous || tracker.classify(incoming) === 'echo') return false;
    if (sameBlocks(incoming, previous) || sameBlocks(incoming, getBlocks())) return false;
    return reconcile(incoming);
  }

  function reconcile(incoming: readonly QuoinBlock[]): boolean {
    const doc = codec.docFromBlocks(incoming);
    if (sameDoc(doc, state.doc)) return false;
    tracker.forgetAll();
    const tr = new Transaction(state, now()).setOrigin('reconcile').setMeta('addToHistory', false);
    if (sameBlocks(codec.blocksFromDoc(doc), incoming)) quiet.add(tr);
    dispatch(tr.step(replaceDocStep(doc)));
    return true;
  }

  function paste(data: { json?: string; html?: string; text?: string }, parser?: DOMParserLike): boolean {
    const { text } = data;
    const ruled = text !== undefined && resolved.pasteRules.some((rule) => rule.match(text, state)?.(state, dispatch));
    if (ruled) return true;
    const slice = sliceFromClipboard(data, { parser, newId });
    return slice !== null && insertSlice(slice, { newId })(state, dispatch);
  }

  function copy() {
    const slice = sliceFromSelection(state, codec);
    return slice === null ? null : sliceToClipboard(slice, { schema });
  }

  const helpers = createCommandHelpers(() => state, dispatch, resolved.commands as F);

  return {
    get state() {
      return state;
    },
    schema,
    resolved,
    codec,
    dispatch,
    createTransaction: () => new Transaction(state, now()),
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    commands: helpers.commands,
    chain: helpers.chain,
    can: helpers.can,
    isActive: (name, attrs) => isActive(state, name, attrs),
    insertText: (text) => insertTextWithRules(text, resolved.inputRules, { newId })(state, dispatch),
    handleKey: (event) => runKeymap(resolved.keymap, state, dispatch, event, isMac),
    paste,
    copy,
    getBlocks,
    setBlocks,
    decorations: () => resolved.decorations(state),
    toMarkdown: (markdown) => toMarkdown(getBlocks(), { schema, ...markdown }),
    destroy() {
      destroyed = true;
      listeners.clear();
    },
  };
}
