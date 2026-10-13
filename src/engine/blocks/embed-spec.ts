import type { BlockSpec } from '../schema/types';
import { extraFields, str, withDefined, withExtra } from './data-fields';

const KNOWN = ['url', 'provider'];

export const embedSpec: BlockSpec = {
  type: 'EMBED',
  flow: 'void',
  fromData: (data) => ({
    attrs: withDefined({ url: str(data.url), provider: str(data.provider), extra: extraFields(data, KNOWN) }),
    regions: {},
  }),
  toData: ({ attrs }) => withExtra({ url: str(attrs.url), provider: str(attrs.provider) }, attrs),
  initial: () => ({ attrs: { url: '', provider: '' }, regions: {} }),
};
