import { render } from '@testing-library/react';
import { QuoinProvider } from '../context';
import { blockByType } from '../registry';
import { coreBlocks } from './core';

describe('coreBlocks', () => {
  it('registers the five core types', () => {
    expect(coreBlocks.map((b) => b.type)).toEqual(['MARKDOWN', 'CALLOUT', 'CODE', 'IMAGE', 'FILE']);
  });

  it('gives every core type a label, an icon and a preview', () => {
    for (const block of coreBlocks) {
      expect(block.label).toBeTruthy();
      expect(block.icon).toBeTruthy();
      expect(block.preview).toBeTruthy();
    }
  });

  it('starts a markdown block with empty markdown', () => {
    expect(blockByType(coreBlocks, 'MARKDOWN')?.initialData?.()).toEqual({ markdown: '' });
  });

  it('seeds the callout with the body field its editor writes', () => {
    expect(blockByType(coreBlocks, 'CALLOUT')?.initialData?.()).toEqual({ tone: 'info', body: '' });
  });

  it('starts a code block with no language and no code', () => {
    expect(blockByType(coreBlocks, 'CODE')?.initialData?.()).toEqual({ language: '', code: '' });
  });

  it('leaves every core type to the canvas, which edits them in place', () => {
    for (const block of coreBlocks) expect(block.editor).toBeUndefined();
  });

  it('starts a file block with no file', () => {
    expect(blockByType(coreBlocks, 'FILE')?.initialData?.()).toEqual({ storageKey: '', filename: '' });
  });

  it.each(coreBlocks.map((b) => [b.type, b] as const))(
    'mounts the %s preview, and its editor if it has one, on its own initialData',
    (_type, block) => {
      const data = block.initialData?.() ?? {};
      const { editor: Editor, preview: Preview } = block;
      expect(Preview).toBeDefined();
      expect(() =>
        render(
          <QuoinProvider value={{ blockTypes: coreBlocks }}>
            {Editor && <Editor data={data} onChange={() => {}} blockId="b" index={0} onRemove={() => {}} />}
            {Preview && <Preview data={data} />}
          </QuoinProvider>,
        ),
      ).not.toThrow();
    },
  );
});
