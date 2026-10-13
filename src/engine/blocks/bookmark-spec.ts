import type { BlockSpec } from '../schema/types';
import { extraFields, optionalString, str, withDefined, withExtra } from './data-fields';

const KNOWN = ['url', 'title', 'description', 'image'];

export const bookmarkSpec: BlockSpec = {
  type: 'BOOKMARK',
  flow: 'void',
  fromData: (data) => ({
    attrs: withDefined({
      url: str(data.url),
      title: optionalString(data.title),
      description: optionalString(data.description),
      image: optionalString(data.image),
      extra: extraFields(data, KNOWN),
    }),
    regions: {},
  }),
  toData: ({ attrs }) =>
    withExtra(
      {
        url: str(attrs.url),
        title: optionalString(attrs.title),
        description: optionalString(attrs.description),
        image: optionalString(attrs.image),
      },
      attrs,
    ),
  initial: () => ({ attrs: { url: '' }, regions: {} }),
};
