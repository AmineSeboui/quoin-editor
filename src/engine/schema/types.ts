import type { Attrs, BlockAttrs, EngineBlock, Inline } from '../model/types';

export type ParseInlineOptions = {
  softBreak?: 'newline' | 'space';
  refs?: ReadonlyMap<string, { href: string; title?: string }>;
};

export type SerializeInlineOptions = {
  escapeLineStart?: boolean;
  escapePipes?: boolean;
  hardBreak?: 'backslash' | 'br';
};

export type InlineCodec = {
  parse(markdown: string, options?: ParseInlineOptions): Inline;
  serialize(inline: Inline, options?: SerializeInlineOptions): string;
};

export type CodecContext = {
  readonly inline: InlineCodec;
  newId(): string;
};

export type BlockContent = { attrs: BlockAttrs; regions: Record<string, Inline> };

export type BlockFlow = 'text' | 'void' | 'structured';

export type MarkdownExportContext = CodecContext & {
  resolveAssetUrl(storageKey: string): string;
  comments: boolean;
};

export type BlockSpec = {
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

export type MarkSpec = {
  readonly type: string;
  readonly inclusive: boolean;
};

export type AtomSpec = {
  readonly type: string;
  plainText(attrs: Attrs): string;
};

export type Schema = {
  readonly blocks: ReadonlyMap<string, BlockSpec>;
  readonly marks: ReadonlyMap<string, MarkSpec>;
  readonly atoms: ReadonlyMap<string, AtomSpec>;
  readonly defaultTextBlock: string;
};
