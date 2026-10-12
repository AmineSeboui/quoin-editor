import type { BlockSpec, Schema } from '../schema/types';

export function unknownBlockSpec(type: string): BlockSpec {
  return {
    type,
    flow: 'void',
    fromData: (data) => ({ attrs: { data }, regions: {} }),
    toData: ({ attrs }) => (attrs.data as Record<string, unknown> | undefined) ?? {},
    initial: () => ({ attrs: { data: {} }, regions: {} }),
  };
}

export function specFor(schema: Schema, type: string): BlockSpec {
  return schema.blocks.get(type) ?? unknownBlockSpec(type);
}
