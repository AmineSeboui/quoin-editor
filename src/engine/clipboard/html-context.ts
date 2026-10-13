import type { BlockAttrs, EngineBlock, Inline, Mark } from '../model/types';

export type Context = {
  readonly indent: number;
  readonly marks: readonly Mark[];
  readonly run: BlockAttrs;
  readonly depth: number;
};

export type Sink = {
  readonly out: EngineBlock[];
  readonly newId: () => string;
  walk(nodes: Iterable<Node>, ctx: Context): void;
};

export const PARAGRAPH: BlockAttrs = { kind: 'paragraph' };

export const child = (ctx: Context, patch: Partial<Context> = {}): Context => ({
  ...ctx,
  ...patch,
  depth: ctx.depth + 1,
});

export function emit(
  sink: Sink,
  type: string,
  indent: number,
  attrs: BlockAttrs,
  regions: Readonly<Record<string, Inline>>,
): void {
  sink.out.push({ id: sink.newId(), type, indent, attrs, regions });
}

export const emitText = (sink: Sink, indent: number, attrs: BlockAttrs, content: Inline): void =>
  emit(sink, 'MARKDOWN', indent, attrs, { text: content });
