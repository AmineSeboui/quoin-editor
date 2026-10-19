import { act } from '@testing-library/react';
import { blockByType } from '../../registry';
import { coreBlocks } from '../core';
import { insertAfterBlock, readBlockData, writeBlockData } from './block-data';
import { bookmarkBlock, mountCanvas, paragraph } from './test-canvas';

const image = { id: 'i', type: 'IMAGE', data: { storageKey: 'cat.png', alt: 'A cat', caption: 'A *cat*' } };

describe('void block data', () => {
  it('reads an unknown type as the data it came with, and a core type as its spec writes it', () => {
    const { handle } = mountCanvas([bookmarkBlock('b', 'quoin.dev'), image]);
    const { controller } = handle();
    const [bookmark, picture] = controller.editor.state.doc.blocks;
    expect(readBlockData(controller, bookmark)).toEqual({ url: 'quoin.dev' });
    expect(readBlockData(controller, picture)).toEqual({ storageKey: 'cat.png', alt: 'A cat', caption: 'A *cat*' });
  });

  it('changes nothing when an editor writes back the data it was given', () => {
    const { handle, changes } = mountCanvas([bookmarkBlock('b', 'quoin.dev'), image]);
    const { controller } = handle();
    act(() => writeBlockData(controller, 'b', { url: 'quoin.dev' }));
    act(() => writeBlockData(controller, 'i', { storageKey: 'cat.png', alt: 'A cat', caption: 'A *cat*' }));
    expect(changes).toEqual([]);
  });

  it('drops a write for a block that is gone by the time it lands', () => {
    const { handle, changes } = mountCanvas([paragraph('a', 'one')]);
    act(() => writeBlockData(handle().controller, 'missing', { url: 'x' }));
    expect(changes).toEqual([]);
  });

  it('inserts a block after another with all of its initial data, its text included', () => {
    const { handle, last } = mountCanvas([bookmarkBlock('b', 'quoin.dev'), paragraph('c', 'below')]);
    const seeded = () => ({ tone: 'tip', body: 'Seeded **tip**' });
    const callout = { ...blockByType(coreBlocks, 'CALLOUT')!, initialData: seeded };
    act(() => insertAfterBlock(handle().controller, 'b', 'CALLOUT', [callout]));
    expect(last()[1]).toEqual({ id: last()[1].id, type: 'CALLOUT', data: { tone: 'tip', body: 'Seeded **tip**' } });
  });
});
