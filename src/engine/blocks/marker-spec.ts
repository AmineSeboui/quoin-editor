import type { BlockSpec } from '../schema/types';
import { extraFields, withDefined, withExtra } from './data-fields';

export function markerSpec(type: string): BlockSpec {
  return {
    type,
    flow: 'void',
    fromData: (data) => ({ attrs: withDefined({ extra: extraFields(data, []) }), regions: {} }),
    toData: ({ attrs }) => withExtra({}, attrs),
    initial: () => ({ attrs: {}, regions: {} }),
  };
}
