import { describe, expect, it } from 'vitest';
import {
  createEditor,
  type Align,
  type Assoc,
  type AtomNode,
  type AtomSpec,
  type AttrsPatch,
  type Attrs,
  type BlockAttrs,
  type BlockChange,
  type BlockCodec,
  type BlockContent,
  type BlockDiff,
  type BlockFlow,
  type BlockRangeSelection,
  type BlockSpec,
  type BlockStructureOptions,
  type BoundCommands,
  type Chain,
  type CodecContext,
  type Command,
  type CommandFactories,
  type CoreCommands,
  type CoreExtensionOptions,
  type CreatedBlock,
  type DOMParserLike,
  type Decoration,
  type Editor,
  type EditorOptions,
  type EditorState,
  type EmbedProvider,
  type EmbedUrl,
  type EngineBlock,
  type EngineDoc,
  type Extension,
  type FromHTMLOptions,
  type FromMarkdownOptions,
  type HTMLOptions,
  type Inline,
  type InlineChange,
  type InlineCodec,
  type InlineNode,
  type InputRule,
  type InputRuleContext,
  type InputRuleRange,
  type InsertTextOptions,
  type KeyLike,
  type Mark,
  type MarkSpec,
  type MarkdownExportContext,
  type MarkdownOptions,
  type NodeSelection,
  type ParseInlineOptions,
  type PasteRule,
  type PluginKey,
  type PluginSpec,
  type Pos,
  type PosMap,
  type QuoinBlock,
  type Schema,
  type SchemaInput,
  type Selection,
  type SerializeInlineOptions,
  type Slice,
  type Step,
  type StepJSON,
  type StepResult,
  type TextNode,
  type TextSelection,
  type TextStats,
  type ToMarkdownOptions,
  type Transaction,
  type TransactionOrigin,
} from './index';

type Named = [
  Align, Assoc, AtomNode, AtomSpec, AttrsPatch, Attrs, BlockAttrs, BlockChange, BlockCodec, BlockContent, BlockDiff,
  BlockFlow, BlockRangeSelection, BlockSpec, BlockStructureOptions, BoundCommands<CoreCommands>, Chain<CoreCommands>,
  CodecContext, Command, CommandFactories, CoreCommands, CoreExtensionOptions, CreatedBlock, DOMParserLike, Decoration,
  Editor, EditorOptions, EditorState, EmbedProvider, EmbedUrl, EngineBlock, EngineDoc, Extension, FromHTMLOptions,
  FromMarkdownOptions, HTMLOptions, Inline, InlineChange, InlineCodec, InlineNode, InputRule, InputRuleContext,
  InputRuleRange, InsertTextOptions, KeyLike, Mark, MarkSpec, MarkdownExportContext, MarkdownOptions, NodeSelection,
  ParseInlineOptions, PasteRule, PluginKey<number>, PluginSpec<number>, Pos, PosMap, QuoinBlock, Schema, SchemaInput,
  Selection, SerializeInlineOptions, Slice, Step, StepJSON, StepResult, TextNode, TextSelection, TextStats,
  ToMarkdownOptions, Transaction, TransactionOrigin,
];

describe('the public types', () => {
  it('can all be named from the entry', () => {
    const none: Named | null = null;
    expect(none).toBeNull();
  });

  it('let a host type an editor with commands of its own', () => {
    type Mine = { shout: (text: string) => Command };
    type Custom = CoreCommands & Mine;
    const typed = (editor: Editor<Custom>) => editor.chain();
    const bound = (commands: BoundCommands<Mine>) => commands.shout('hi');
    expect([typeof typed, typeof bound]).toEqual(['function', 'function']);
  });

  it('keeps the resolved extensions and the codec off the public editor', () => {
    const editor = createEditor({ blocks: [] });
    // @ts-expect-error the resolved extensions are for the package's own layers
    void editor.resolved;
    // @ts-expect-error the codec is for the package's own layers
    void editor.codec;
    expect(editor.schema.blocks.has('MARKDOWN')).toBe(true);
  });
});
