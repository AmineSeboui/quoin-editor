import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';

describe('a block the canvas has no definition or renderer for', () => {
  it('is named and drawn as an unsupported block, never by its raw type', () => {
    const { shell } = mountCanvas([paragraph('a', 'above'), { id: 'z', type: 'CHART', data: { series: [1] } }]);
    expect(screen.getByRole('group', { name: 'Unsupported block' })).toHaveTextContent('Unsupported block');
    expect(shell('z')).not.toHaveTextContent('CHART');
  });

  it('takes that name from the canvas labels', () => {
    mountCanvas([{ id: 'z', type: 'CHART', data: {} }], { labels: { unsupportedBlock: 'Bloc non pris en charge' } });
    expect(screen.getByRole('group', { name: 'Bloc non pris en charge' })).toHaveTextContent('Bloc non pris en charge');
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
