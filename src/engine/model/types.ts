export type Attrs = Readonly<Record<string, string>>;

export type Mark = { readonly type: string; readonly attrs?: Attrs };

export type TextNode = { readonly kind: 'text'; readonly text: string; readonly marks: readonly Mark[] };
export type AtomNode = {
  readonly kind: 'atom';
  readonly type: string;
  readonly attrs: Attrs;
  readonly marks: readonly Mark[];
};
export type InlineNode = TextNode | AtomNode;
export type Inline = readonly InlineNode[];

export type BlockAttrs = Readonly<Record<string, unknown>>;

export type EngineBlock = {
  readonly id: string;
  readonly type: string;
  readonly indent: number;
  readonly attrs: BlockAttrs;
  readonly regions: Readonly<Record<string, Inline>>;
};

export type EngineDoc = {
  readonly blocks: readonly EngineBlock[];
  readonly index: ReadonlyMap<string, number>;
};

export type Pos = { readonly block: string; readonly region: string; readonly offset: number };

export type TextSelection = { readonly kind: 'text'; readonly anchor: Pos; readonly head: Pos };
export type NodeSelection = { readonly kind: 'node'; readonly block: string };
export type BlockRangeSelection = { readonly kind: 'blocks'; readonly anchor: string; readonly head: string };
export type Selection = TextSelection | NodeSelection | BlockRangeSelection;
