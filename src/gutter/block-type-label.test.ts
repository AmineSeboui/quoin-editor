import { coreBlocks } from '../blocks/core';
import { createBlock } from '../engine/commands/block-helpers';
import { createSchema } from '../engine';
import { englishLabels } from '../i18n/english-labels';
import { blockTypeLabel } from './block-type-label';

const blockNames = { ...englishLabels.blockNames, image: 'Bild', file: 'Datei', code: 'Quelltext' };
const labels = { ...englishLabels, blockNames };
const schema = createSchema();

describe('blockTypeLabel', () => {
  it('names the image, file and code blocks in the words of the labels', () => {
    const name = (type: string) => blockTypeLabel(labels, createBlock(schema, type, {}, 0), coreBlocks);
    const names = ['IMAGE', 'FILE', 'CODE'].map(name);
    expect(names).toEqual(['Bild', 'Datei', 'Quelltext']);
  });
});
