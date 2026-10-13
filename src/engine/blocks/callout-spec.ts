import type { BlockSpec } from '../schema/types';
import { extraFields, optionalString, regionOf, str, withDefined, withExtra } from './data-fields';

const KNOWN = ['tone', 'body', 'icon'];

export const calloutSpec: BlockSpec = {
  type: 'CALLOUT',
  flow: 'text',
  primaryRegion: 'body',
  enter: 'hardBreak',

  fromData: (data, ctx) => ({
    attrs: withDefined({ tone: str(data.tone), icon: optionalString(data.icon), extra: extraFields(data, KNOWN) }),
    regions: { body: ctx.inline.parse(str(data.body)) },
  }),

  toData: (block, ctx) =>
    withExtra(
      {
        tone: str(block.attrs.tone),
        body: ctx.inline.serialize(regionOf(block, 'body'), { escapeLineStart: true }),
        icon: optionalString(block.attrs.icon),
      },
      block.attrs,
    ),

  initial: () => ({ attrs: { tone: 'info' }, regions: { body: [] } }),
};
