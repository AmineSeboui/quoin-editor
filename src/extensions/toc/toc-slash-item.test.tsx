import { screen, within } from '@testing-library/react';
import { paragraph } from '../../blocks/void/test-canvas';
import { textSelection } from '../../engine';
import { heading, mountToc } from './toc-test-canvas';

const commands = () => screen.getByRole('listbox', { name: 'Commands' });

describe('the Table of contents command', () => {
  it.each(['toc', 'contents', 'outline'])('is found as /%s in the advanced group', (query) => {
    const { caret, type } = mountToc([heading('h', 1, 'Intro'), paragraph('p', '')]);
    caret('p', 0);
    type(`/${query}`);
    const chosen = within(commands()).getByRole('option', { selected: true });
    expect(chosen).toHaveTextContent('Table of contents');
    expect(chosen).toHaveTextContent('Links to the headings of the page');
    expect(chosen.closest('[role="group"]')).toHaveAccessibleName('Advanced');
  });

  it('inserts a table of contents above the empty line, where the caret stays', () => {
    const { caret, type, key, last, selection, nav } = mountToc([heading('h', 1, 'Intro'), paragraph('p', '')]);
    caret('p', 0);
    type('/toc');
    key('Enter');
    expect(last().map(({ id, type: kind }) => (kind === 'TOC' ? kind : id))).toEqual(['h', 'TOC', 'p']);
    expect(last()[1].data).toEqual({});
    expect(selection()).toEqual(textSelection({ block: 'p', region: 'text', offset: 0 }));
    expect(within(nav()).getByRole('link', { name: 'Intro' })).toBeInTheDocument();
  });

  it('takes its title and description from the labels', () => {
    const { caret, type } = mountToc([paragraph('p', '')], {
      labels: { tableOfContents: 'Sommaire', tableOfContentsDescription: 'Les titres de la page' },
    });
    caret('p', 0);
    type('/somm');
    const chosen = within(commands()).getByRole('option', { selected: true });
    expect(chosen).toHaveTextContent('Sommaire');
    expect(chosen).toHaveTextContent('Les titres de la page');
  });
});
