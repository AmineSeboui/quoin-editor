import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { mountCanvas, paragraph } from './test-canvas';

describe('a block the canvas has no definition or renderer for', () => {
  it('is a separator named Divider when it is a divider', () => {
    mountCanvas([paragraph('a', 'above'), { id: 'd', type: 'DIVIDER', data: {} }]);
    const divider = screen.getByRole('separator', { name: 'Divider' });
    expect(divider).toHaveAttribute('contenteditable', 'false');
    expect(divider).toHaveTextContent('');
  });

  it('is named and drawn as an unsupported block, never by its raw type', () => {
    const { shell } = mountCanvas([paragraph('a', 'above'), { id: 'z', type: 'CHART', data: { series: [1] } }]);
    expect(screen.getByRole('group', { name: 'Unsupported block' })).toHaveTextContent('Unsupported block');
    expect(shell('z')).not.toHaveTextContent('CHART');
  });

  it('words both names from the labels', () => {
    mountCanvas([{ id: 'd', type: 'DIVIDER', data: {} }, { id: 'z', type: 'CHART', data: {} }], {
      labels: { divider: 'Séparateur', unsupportedBlock: 'Bloc non pris en charge' },
    });
    expect(screen.getByRole('separator', { name: 'Séparateur' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Bloc non pris en charge' })).toBeInTheDocument();
  });

  it('has no accessibility violations beside void blocks and text', async () => {
    const { container } = mountCanvas([
      paragraph('a', 'above'),
      { id: 'd', type: 'DIVIDER', data: {} },
      { id: 'b', type: 'BOOKMARK', data: { url: 'quoin.dev' } },
      { id: 'z', type: 'CHART', data: {} },
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });
});
