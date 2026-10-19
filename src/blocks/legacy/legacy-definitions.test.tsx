import { fireEvent, screen } from '@testing-library/react';
import type { QuoinBlock } from '../../types';
import { mountCanvas } from '../void/test-canvas';
import { legacyDefinitions } from './legacy-definitions';

const image: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: 'cat.png', alt: 'A cat' } };
const file: QuoinBlock = { id: 'f', type: 'FILE', data: { storageKey: 'k1', filename: 'notes.pdf' } };

describe('the 0.4 media blocks', () => {
  it('are the IMAGE and FILE definitions, each with an editor and a preview', () => {
    expect(legacyDefinitions.map((definition) => definition.type)).toEqual(['IMAGE', 'FILE']);
    for (const definition of legacyDefinitions) {
      expect(definition.editor).toBeDefined();
      expect(definition.preview).toBeDefined();
    }
  });

  it('draw their previews in the canvas as void blocks named after them', () => {
    mountCanvas([image, file], { resolveAssetUrl: (key) => `/cdn/${key}` });
    expect(screen.getByRole('group', { name: 'Image' })).toContainElement(screen.getByAltText('A cat'));
    expect(screen.getByAltText('A cat')).toHaveAttribute('src', '/cdn/cat.png');
    expect(screen.getByRole('group', { name: 'File' })).toHaveTextContent('notes.pdf');
  });

  it('keep an image caption typed in the 0.4 editor as the text it reads, in the inline markdown the region stores', () => {
    const { nodeSelect, press, last } = mountCanvas([image]);
    nodeSelect('i');
    press('Enter');
    fireEvent.change(screen.getByLabelText('Image caption'), { target: { value: 'A **sleepy** cat' } });
    expect(last()[0].data).toMatchObject({ storageKey: 'cat.png', alt: 'A cat', caption: 'A \\*\\*sleepy\\*\\* cat' });
    expect(screen.getByLabelText('Image caption')).toHaveValue('A **sleepy** cat');
  });
});
