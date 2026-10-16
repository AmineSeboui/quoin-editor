import { fireEvent, screen } from '@testing-library/react';
import type { QuoinBlock } from '../../types';
import { mountCanvas } from '../void/test-canvas';
import { legacyDefinitions } from './legacy-definitions';

const code: QuoinBlock = { id: 'k', type: 'CODE', data: { language: 'ts', code: 'let a = 1;' } };
const image: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: 'cat.png', alt: 'A cat' } };
const file: QuoinBlock = { id: 'f', type: 'FILE', data: { storageKey: 'k1', filename: 'notes.pdf' } };

describe('the 0.4 media blocks', () => {
  it('are the CODE, IMAGE and FILE definitions, each with an editor and a preview', () => {
    expect(legacyDefinitions.map((definition) => definition.type)).toEqual(['CODE', 'IMAGE', 'FILE']);
    for (const definition of legacyDefinitions) {
      expect(definition.editor).toBeDefined();
      expect(definition.preview).toBeDefined();
    }
  });

  it('draw their previews in the canvas as void blocks named after them', () => {
    mountCanvas([code, image, file], { resolveAssetUrl: (key) => `/cdn/${key}` });
    expect(screen.getByRole('group', { name: 'Code' })).toHaveTextContent('let a = 1;');
    expect(screen.getByRole('group', { name: 'Image' })).toContainElement(screen.getByAltText('A cat'));
    expect(screen.getByAltText('A cat')).toHaveAttribute('src', '/cdn/cat.png');
    expect(screen.getByRole('group', { name: 'File' })).toHaveTextContent('notes.pdf');
  });

  it('edit in place: the code typed in the CODE editor reaches onChange and the preview', () => {
    const { nodeSelect, press, last } = mountCanvas([code]);
    nodeSelect('k');
    press('Enter');
    fireEvent.change(screen.getByRole('textbox', { name: 'Code' }), { target: { value: 'let b = 2;' } });
    expect(last()).toEqual([{ id: 'k', type: 'CODE', data: { language: 'ts', code: 'let b = 2;' } }]);
    press('Escape', screen.getByRole('textbox', { name: 'Code' }));
    expect(screen.getByRole('group', { name: 'Code' })).toHaveTextContent('let b = 2;');
  });

  it('keep an image caption written in the 0.4 editor, as the caption region holds it', () => {
    const { nodeSelect, press, last } = mountCanvas([image]);
    nodeSelect('i');
    press('Enter');
    fireEvent.change(screen.getByLabelText('Image caption'), { target: { value: 'A **sleepy** cat' } });
    expect(last()[0].data).toMatchObject({ storageKey: 'cat.png', alt: 'A cat', caption: 'A **sleepy** cat' });
  });
});
