import { createSchema } from '../schema/create-schema';
import type { BlockSpec } from '../schema/types';

const noteSpec: BlockSpec = {
  type: 'NOTE',
  flow: 'text',
  primaryRegion: 'text',
  fromData: (data, ctx) => ({
    attrs: { tone: String(data.tone) },
    regions: { text: ctx.inline.parse(String(data.text)) },
  }),
  toData: (block, ctx) => ({ tone: block.attrs.tone, text: ctx.inline.serialize(block.regions.text) }),
  initial: () => ({ attrs: { tone: 'plain' }, regions: { text: [] } }),
};

export const noteSchema = createSchema({ blocks: [noteSpec] });
export const note = (text: string, tone = 'warn') => ({ id: 'n', type: 'NOTE', data: { tone, text } });
