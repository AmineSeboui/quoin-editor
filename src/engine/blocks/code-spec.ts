import type { BlockSpec } from '../schema/types';
import { extraFields, str, withDefined, withExtra } from './data-fields';

const KNOWN = ['language', 'code'];

export const codeSpec: BlockSpec = {
  type: 'CODE',
  flow: 'void',
  fromData: (data) => ({
    attrs: withDefined({ language: str(data.language), code: str(data.code), extra: extraFields(data, KNOWN) }),
    regions: {},
  }),
  toData: ({ attrs }) => withExtra({ language: str(attrs.language), code: str(attrs.code) }, attrs),
  initial: () => ({ attrs: { language: '', code: '' }, regions: {} }),
};
