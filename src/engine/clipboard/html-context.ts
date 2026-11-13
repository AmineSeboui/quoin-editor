import type { BlockAttrs, EngineBlock, Inline, Mark } from '../model/types';
import type { SizedHeading } from './html-font-size';
import type { StyleMap } from './html-styles';
import { boxedTask } from './html-task-box';

export type Context = {
  readonly indent: number;
  readonly marks: readonly Mark[];
  readonly run: BlockAttrs;
  readonly preformatted: boolean;
  readonly depth: number;
};

export type Sink = {
  readonly out: EngineBlock[];
  readonly newId: () => string;
  readonly sizedHeading: SizedHeading;
  /** What the classes of an element set in the style sheets pasted with it, which name the paragraph styles of Word. */
  readonly classStyle: (element: Element) => StyleMap;
  /** Where a paste that can hold pictures out of the document keeps the data addresses of the ones it carries inline. */
  readonly pictures?: string[];
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

export function emitText(sink: Sink, indent: number, attrs: BlockAttrs, content: Inline): void {
  const task = boxedTask(attrs, content);
  emit(sink, 'MARKDOWN', indent, task.attrs, { text: task.content });
}
