import type { BlockSpec } from '../schema/types';
import { extraFields, str, withDefined, withExtra } from './data-fields';

export const mathSpec: BlockSpec = {
  type: 'MATH',
  flow: 'void',
  fromData: (data) => ({
    attrs: withDefined({ latex: str(data.latex), extra: extraFields(data, ['latex']) }),
    regions: {},
  }),
  toData: ({ attrs }) => withExtra({ latex: str(attrs.latex) }, attrs),
  initial: () => ({ attrs: { latex: '' }, regions: {} }),
};
