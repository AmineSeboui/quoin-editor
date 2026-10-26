import { createBlockCodec } from '../engine/blocks/codec';
import { changeBetween } from '../engine/diff/block-change';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { createSchema } from '../engine/schema/create-schema';
import { changedAttributes } from './changed-attributes';

const schema = createSchema();
const codec = createBlockCodec(schema);
const md = (markdown: string): QuoinBlock => ({ id: 'a', type: 'MARKDOWN', data: { markdown } });
const named = (before: string, after: string) =>
  changedAttributes(changeBetween(md(before), md(after), schema, codec.context), codec);

describe('changedAttributes', () => {
  it('names what changed in a later piece of a block that holds several', () => {
    expect(named('Intro\n\n## Title', 'Intro\n\n### Title')).toEqual(['level']);
  });

  it('names a piece only one version holds', () => {
    expect(named('Intro', 'Intro\n\n> Quote')).toEqual(['kind']);
  });

  it('names nothing when every piece keeps its attributes', () => {
    expect(named('Intro\n\n## Title', 'Intro\n\n## Heading')).toEqual([]);
  });
});
