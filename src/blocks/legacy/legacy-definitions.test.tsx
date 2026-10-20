import { screen } from '@testing-library/react';
import type { QuoinBlock } from '../../types';
import { mountCanvas } from '../void/test-canvas';
import { legacyDefinitions } from './legacy-definitions';

const file: QuoinBlock = { id: 'f', type: 'FILE', data: { storageKey: 'k1', filename: 'notes.pdf' } };

describe('the 0.4 file block', () => {
  it('is the FILE definition, with an editor and a preview', () => {
    expect(legacyDefinitions.map((definition) => definition.type)).toEqual(['FILE']);
    expect(legacyDefinitions[0].editor).toBeDefined();
    expect(legacyDefinitions[0].preview).toBeDefined();
  });

  it('draws its preview in the canvas as a void block named after it', () => {
    mountCanvas([file]);
    expect(screen.getByRole('group', { name: 'File' })).toHaveTextContent('notes.pdf');
  });
});
