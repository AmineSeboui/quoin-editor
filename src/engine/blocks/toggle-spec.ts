import type { BlockSpec } from '../schema/types';
import { extraFields, regionOf, str, withDefined, withExtra } from './data-fields';

const KNOWN = ['markdown', 'open'];

export const toggleSpec: BlockSpec = {
  type: 'TOGGLE',
  flow: 'text',
  primaryRegion: 'text',

  fromData: (data, ctx) => ({
    attrs: withDefined({ open: data.open === true, extra: extraFields(data, KNOWN) }),
    regions: { text: ctx.inline.parse(str(data.markdown)) },
  }),

  toData: (block, ctx) =>
    withExtra(
      {
        markdown: ctx.inline.serialize(regionOf(block, 'text'), { escapeLineStart: true }),
        open: block.attrs.open === true,
      },
      block.attrs,
    ),

  initial: () => ({ attrs: { open: true }, regions: { text: [] } }),
  splitAttrs: () => ({ type: 'MARKDOWN', attrs: { kind: 'paragraph' } }),
};
