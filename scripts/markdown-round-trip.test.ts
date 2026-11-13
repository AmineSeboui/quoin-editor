// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fromMarkdown, toHTML, toMarkdown, type QuoinBlock } from '../src/engine';
import { roundTrip, splitFrontMatter } from './markdown-round-trip.mjs';

const engine = { fromMarkdown, toMarkdown, toHTML };

describe('splitFrontMatter', () => {
  it('sets aside a YAML block at the very top, with the lines it took', () => {
    expect(splitFrontMatter('---\ntitle: A\n---\n\n# Doc\n')).toEqual({
      frontMatter: '---\ntitle: A\n---\n',
      body: '\n# Doc\n',
      lines: 3,
    });
  });

  it('leaves a divider that is not at the top, and a file with none, as they are', () => {
    expect(splitFrontMatter('# Doc\n\n---\n\nText\n---\n')).toEqual({ frontMatter: null, body: '# Doc\n\n---\n\nText\n---\n', lines: 0 });
    expect(splitFrontMatter('Text\n')).toEqual({ frontMatter: null, body: 'Text\n', lines: 0 });
  });

  it('reads a divider followed by a blank line at the top as a divider, and an empty block as front matter', () => {
    expect(splitFrontMatter('---\n\nText\n\n---\n').frontMatter).toBeNull();
    expect(splitFrontMatter('---\n---\nText\n').frontMatter).toBe('---\n---\n');
  });
});

describe('roundTrip', () => {
  it('calls a file unchanged when the markdown written back is what was read', () => {
    const result = roundTrip('# Title\n\nSome **bold** text.\n\n- one\n- two\n', engine);
    expect(result.status).toBe('unchanged');
    expect(result.blocks?.map((block: QuoinBlock) => block.data.markdown)).toEqual([
      '# Title',
      'Some **bold** text.',
      '- one',
      '- two',
    ]);
  });

  it('ignores line endings, blank lines at the edges and a missing final newline', () => {
    expect(roundTrip('\n\n# Title\r\n\r\nText', engine).status).toBe('unchanged');
  });

  it('calls a file changed when the markdown differs, and names the first line that does', () => {
    const result = roundTrip('# Title\n\n* star\n', engine);
    expect(result.status).toBe('changed');
    expect(result.difference).toEqual({ line: 3, source: '* star', written: '- star' });
  });

  it('converts the body under front matter and counts lines from the top of the file', () => {
    const result = roundTrip('---\ntitle: A\n---\n\n# Doc\n\nSetext\n===\n', engine);
    expect(result.frontMatter).toBe('---\ntitle: A\n---\n');
    expect(result.blocks?.map((block: QuoinBlock) => block.data.markdown)).toEqual(['# Doc', '# Setext']);
    expect(result.difference).toEqual({ line: 7, source: 'Setext', written: '# Setext' });
  });

  it('counts a list numbered 1, 1, 1 as changed, not failed, since it draws as 1, 2, 3 either way', () => {
    const result = roundTrip('1. a\n1. b\n', engine);
    expect(result.status).toBe('changed');
    expect(result.difference).toEqual({ line: 2, source: '1. b', written: '2. b' });
  });

  it('gives every block an id, from the generator when one is passed', () => {
    let n = 0;
    const result = roundTrip('a\n\nb\n', engine, { newId: () => `doc-${++n}` });
    expect(result.blocks?.map((block: QuoinBlock) => block.id)).toEqual(['doc-1', 'doc-2']);
  });

  it('fails a file whose written markdown reads back to a document that draws differently', () => {
    const dropsTheLast = { ...engine, toMarkdown: (blocks: readonly QuoinBlock[]) => toMarkdown(blocks.slice(0, -1)) };
    const result = roundTrip('a\n\nb\n', dropsTheLast);
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/^reads back differently/);
    expect(result.redrawn).toEqual({ block: 2, converted: '{"type":"MARKDOWN","data":{"markdown":"b"}}', readBack: null });
  });

  it('names the first block that draws differently, keeping list numbers in their context', () => {
    const renumbers = { ...engine, toMarkdown: (blocks: readonly QuoinBlock[]) => toMarkdown(blocks).replace('- c', '- C') };
    const result = roundTrip('1. a\n1. b\n\n- c\n', renumbers);
    expect(result.status).toBe('failed');
    expect(result.redrawn).toMatchObject({ block: 3, readBack: '{"type":"MARKDOWN","data":{"markdown":"- C"}}' });
  });

  it('fails a file whose conversion throws, with the message', () => {
    const throws = {
      ...engine,
      fromMarkdown: () => {
        throw new Error('no parse');
      },
    };
    expect(roundTrip('a\n', throws)).toMatchObject({ status: 'failed', error: 'no parse', blocks: null });
  });
});
