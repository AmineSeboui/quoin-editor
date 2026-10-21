import { coreBlocks } from '../blocks/core';
import { createBlock } from '../engine/commands/block-helpers';
import { createSchema, type EngineBlock } from '../engine';
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

  it('names a type an extension draws by the name it gives, and leaves the core names to the labels', () => {
    const block = (type: string): EngineBlock => ({ id: 'b', type, attrs: {}, regions: {}, indent: 0 });
    const extensionNames = { CHART: 'Chart', IMAGE: 'Picture' };
    expect(blockTypeLabel(labels, block('CHART'), coreBlocks, extensionNames)).toBe('Chart');
    expect(blockTypeLabel(labels, block('IMAGE'), coreBlocks, extensionNames)).toBe('Bild');
    expect(blockTypeLabel(labels, block('MAP'), coreBlocks, extensionNames)).toBe('Unsupported block');
    expect(blockTypeLabel(labels, block('toString'), coreBlocks, extensionNames)).toBe('Unsupported block');
    expect(blockTypeLabel(labels, block('CHART'), coreBlocks)).toBe('Unsupported block');
  });
});
