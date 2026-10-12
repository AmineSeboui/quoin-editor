import type { BlockSpec } from '../schema/types';
import {
  alignOrUndefined,
  extraFields,
  optionalNumber,
  optionalString,
  regionOf,
  str,
  withDefined,
  withExtra,
} from './data-fields';

const KNOWN = ['storageKey', 'alt', 'caption', 'width', 'height', 'url', 'align', 'widthPercent'];

export const imageSpec: BlockSpec = {
  type: 'IMAGE',
  flow: 'structured',

  fromData: (data, ctx) => ({
    attrs: withDefined({
      storageKey: str(data.storageKey),
      alt: str(data.alt),
      width: optionalNumber(data.width),
      height: optionalNumber(data.height),
      url: optionalString(data.url),
      align: alignOrUndefined(data.align),
      widthPercent: optionalNumber(data.widthPercent),
      extra: extraFields(data, KNOWN),
    }),
    regions: { caption: ctx.inline.parse(str(data.caption)) },
  }),

  toData: (block, ctx) =>
    withExtra(
      {
        storageKey: str(block.attrs.storageKey),
        alt: str(block.attrs.alt),
        caption: ctx.inline.serialize(regionOf(block, 'caption')) || undefined,
        width: optionalNumber(block.attrs.width),
        height: optionalNumber(block.attrs.height),
        url: optionalString(block.attrs.url),
        align: alignOrUndefined(block.attrs.align),
        widthPercent: optionalNumber(block.attrs.widthPercent),
      },
      block.attrs,
    ),

  initial: () => ({ attrs: { storageKey: '', alt: '' }, regions: { caption: [] } }),
};
