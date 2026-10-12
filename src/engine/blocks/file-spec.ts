import type { BlockSpec } from '../schema/types';
import { extraFields, optionalNumber, optionalString, str, withDefined, withExtra } from './data-fields';

const KNOWN = ['storageKey', 'filename', 'size', 'mime'];

export const fileSpec: BlockSpec = {
  type: 'FILE',
  flow: 'void',
  fromData: (data) => ({
    attrs: withDefined({
      storageKey: str(data.storageKey),
      filename: str(data.filename),
      size: optionalNumber(data.size),
      mime: optionalString(data.mime),
      extra: extraFields(data, KNOWN),
    }),
    regions: {},
  }),
  toData: ({ attrs }) =>
    withExtra(
      {
        storageKey: str(attrs.storageKey),
        filename: str(attrs.filename),
        size: optionalNumber(attrs.size),
        mime: optionalString(attrs.mime),
      },
      attrs,
    ),
  initial: () => ({ attrs: { storageKey: '', filename: '' }, regions: {} }),
};
