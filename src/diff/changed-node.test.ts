import { createBlockCodec } from '../engine/blocks/codec';
import { changeBetween } from '../engine/diff/block-change';
import type { TextNode } from '../engine/model/types';
import { createSchema } from '../engine/schema/create-schema';
import { blockNode } from '../engine/render/block-node';
import { inlineOf, type BlockRenderer, type HtmlEnv } from '../engine/render/html-env';
import { element } from '../engine/render/html-node';
import { serializeHtml } from '../engine/render/serialize-html';
import { changedNode } from './changed-node';
import { englishDiffLabels } from './diff-labels';

const schema = createSchema();
const codec = createBlockCodec(schema);
const env: HtmlEnv = { resolveAssetUrl: () => null, embeds: 'link', embedProviders: [], headings: [], taskLabel: 'Task', frameTitle: String };
const before = { id: 'a', type: 'MARKDOWN', data: { markdown: 'old words' } };
const after = { id: 'a', type: 'MARKDOWN', data: { markdown: 'new words' } };
const change = changeBetween(before, after, schema, codec.context);
const [block] = codec.toEngineBlocks(after);

const draw = (render: BlockRenderer) =>
  serializeHtml([changedNode(block, { excess: 0, children: [] }, env, change, render, englishDiffLabels)]);

describe('a changed block', () => {
  it('marks the words of the regions its renderer draws through inlineOf', () => {
    expect(draw(blockNode)).toMatch(/^<p><del>.*old.*<\/del><ins>.*new.*<\/ins> words<\/p>$/);
  });

  it('is drawn as the newer version, never showing a placeholder, when its renderer reads a region another way', () => {
    const titled: BlockRenderer = (shown) => {
      const [first] = shown.regions.text as TextNode[];
      return element('p', [['title', `Says ${first.text}`]], inlineOf(shown.regions.text, env));
    };
    expect(draw(titled)).toBe('<p title="Says new words">new words</p>');
  });
});
