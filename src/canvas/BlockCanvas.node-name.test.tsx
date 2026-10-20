import { bookmarkBlock, mountCanvas, paragraph } from '../blocks/void/test-canvas';
import { englishLabels } from '../i18n/english-labels';
import type { QuoinBlock } from '../types';

const image = (id: string, alt: string): QuoinBlock => ({ id, type: 'IMAGE', data: { storageKey: 'k', alt } });

describe('a block the canvas selects as a whole', () => {
  it('is named in the sink by its alt text, its text, or else what the canvas calls it', () => {
    const blocks: QuoinBlock[] = [
      paragraph('a', 'above'),
      image('i', 'A cat'),
      image('j', ''),
      { id: 'd', type: 'DIVIDER', data: {} },
      bookmarkBlock('b', 'quoin.dev'),
      { id: 'n', type: 'PINNED', data: { note: '' } },
    ];
    const { nodeSelect, sink } = mountCanvas(blocks);
    const names = ['i', 'j', 'd', 'b', 'n'].map((id) => {
      nodeSelect(id);
      return sink().getAttribute('aria-label');
    });
    expect(names).toEqual(['A cat', 'Image, no description', 'Divider', 'quoin.dev', 'Pinned note']);
  });

  it('is named in the labels the host gave the canvas', () => {
    const { nodeSelect, sink } = mountCanvas([image('j', ''), { id: 'd', type: 'DIVIDER', data: {} }], {
      labels: { imageNoAlt: 'Image sans description', blockNames: { ...englishLabels.blockNames, divider: 'Separateur' } },
    });
    nodeSelect('j');
    expect(sink()).toHaveAccessibleName('Image sans description');
    nodeSelect('d');
    expect(sink()).toHaveAccessibleName('Separateur');
  });
});
