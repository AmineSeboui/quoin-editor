import { parseLine, type LineAttrs } from '../markdown/line-kind';
import { lineMarkdown } from '../markdown/line-markdown';
import type { BlockSpec } from '../schema/types';
import {
  alignOrUndefined,
  extraFields,
  paletteOrUndefined,
  regionOf,
  str,
  withDefined,
  withExtra,
} from './data-fields';

const KNOWN = ['markdown', 'align', 'color', 'background'];

export const markdownSpec: BlockSpec = {
  type: 'MARKDOWN',
  flow: 'text',
  primaryRegion: 'text',

  fromData(data, ctx) {
    const { rest, ...line } = parseLine(str(data.markdown));
    return {
      attrs: withDefined({
        ...line,
        align: alignOrUndefined(data.align),
        color: paletteOrUndefined(data.color),
        background: paletteOrUndefined(data.background),
        extra: extraFields(data, KNOWN),
      }),
      regions: { text: ctx.inline.parse(rest) },
    };
  },

  toData(block, ctx) {
    const line = block.attrs as LineAttrs;
    const hardBreak = line.kind === 'heading' ? 'br' : 'backslash';
    const body = ctx.inline.serialize(regionOf(block, 'text'), { escapeLineStart: true, hardBreak });
    return withExtra(
      {
        markdown: lineMarkdown(line, body),
        align: alignOrUndefined(block.attrs.align),
        color: paletteOrUndefined(block.attrs.color),
        background: paletteOrUndefined(block.attrs.background),
      },
      block.attrs,
    );
  },

  initial: () => ({ attrs: { kind: 'paragraph' }, regions: { text: [] } }),

  splitAttrs(attrs) {
    const kind = attrs.kind === 'heading' ? 'paragraph' : attrs.kind;
    return {
      type: 'MARKDOWN',
      attrs: withDefined({
        kind,
        checked: kind === 'task' ? false : undefined,
        align: alignOrUndefined(attrs.align),
      }),
    };
  },
};
