import { describe, expect, it } from 'vitest';
import { equalInline, text } from '../model/inline';
import type { EngineBlock } from '../model/types';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';

const codec = createBlockCodec(createSchema(), { newId: () => 'new' });

const markdownOf = (attrs: EngineBlock['attrs'], value: string) => {
  const block: EngineBlock = { id: 'b', type: 'MARKDOWN', indent: 0, attrs, regions: { text: [text(value)] } };
  const { data } = codec.toQuoin(block);
  const [back] = codec.toEngineBlocks({ id: 'b', type: 'MARKDOWN', data });
  return { markdown: data.markdown, same: equalInline(back.regions.text, [text(value)]) };
};

describe('MARKDOWN heading text', () => {
  it('writes a hard break as br so the heading stays on one line', () => {
    expect(markdownOf({ kind: 'heading', level: 2 }, 'a\nb')).toEqual({ markdown: '## a<br>b', same: true });
  });

  it('keeps the backslash form of a hard break in other kinds', () => {
    expect(markdownOf({ kind: 'paragraph' }, 'a\nb')).toEqual({ markdown: 'a\\\nb', same: true });
    expect(markdownOf({ kind: 'bullet' }, 'a\nb')).toEqual({ markdown: '- a\\\nb', same: true });
  });

  it('protects a closing hash run after a tab as well as after a space', () => {
    expect(markdownOf({ kind: 'heading', level: 1 }, 'a\t#')).toEqual({ markdown: '# a\t\\#', same: true });
    expect(markdownOf({ kind: 'heading', level: 1 }, 'a ##')).toEqual({ markdown: '# a \\##', same: true });
  });
});
