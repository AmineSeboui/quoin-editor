import { atom, normalizeInline, text } from '../../model/inline';
import { addMark } from '../../model/marks';
import type { Attrs, Inline, InlineNode, Mark } from '../../model/types';
import { createActiveMarks } from './active-marks';
import type { TagInfo } from './html-tags';

export type MarkRange = { readonly mark: Mark };

export type DelimiterChar = '*' | '_' | '~';

export type TextItem = { readonly kind: 'text'; text: string; readonly marks?: readonly Mark[] };

export type DelimiterItem = {
  readonly kind: 'delimiter';
  readonly char: DelimiterChar;
  readonly length: number;
  readonly canOpen: boolean;
  readonly canClose: boolean;
  count: number;
  readonly opens: MarkRange[];
  readonly closes: MarkRange[];
};

export type TagItem = { readonly kind: 'tag'; readonly source: string; readonly tag: TagInfo; range?: MarkRange };

export type Item =
  | TextItem
  | DelimiterItem
  | TagItem
  | { readonly kind: 'atom'; readonly type: string; readonly attrs: Attrs }
  | { readonly kind: 'open'; readonly range: MarkRange }
  | { readonly kind: 'close'; readonly range: MarkRange };

export function flattenItems(items: readonly Item[]): Inline {
  const { open, close, current } = createActiveMarks();
  const nodes: InlineNode[] = [];
  const marksWith = (own: readonly Mark[] = []) =>
    own.reduce<readonly Mark[]>((set, mark) => addMark(set, mark), current());
  const emit = (value: string, own?: readonly Mark[]) => nodes.push(text(value, marksWith(own)));

  for (const item of items) {
    if (item.kind === 'text') emit(item.text, item.marks);
    else if (item.kind === 'atom') nodes.push(atom(item.type, item.attrs, marksWith()));
    else if (item.kind === 'open') open(item.range);
    else if (item.kind === 'close') close(item.range);
    else if (item.kind === 'delimiter') {
      item.closes.forEach(close);
      emit(item.char.repeat(item.count));
      item.opens.forEach(open);
    } else if (!item.range) emit(item.source);
    else if (item.tag.close) close(item.range);
    else open(item.range);
  }
  return normalizeInline(nodes);
}
