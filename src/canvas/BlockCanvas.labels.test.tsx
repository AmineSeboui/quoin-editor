import { render, screen } from '@testing-library/react';
import type { QuoinBlock } from '../types';
import { BlockCanvas } from './BlockCanvas';

const blocks: QuoinBlock[] = [{ id: 'p', type: 'MARKDOWN', data: { markdown: 'Text' } }];
const noop = () => {};

describe('the labels a BlockCanvas speaks', () => {
  it('are English when the host overrides none', () => {
    render(<BlockCanvas blocks={blocks} onChange={noop} />);
    expect(screen.getByRole('group', { name: 'Editor' })).toHaveAccessibleDescription(
      'Press Escape, then Tab, to leave the editor.',
    );
  });

  it('name the editor and describe the way out of it in the words the host gives', () => {
    const labels = { document: 'Document', editorHint: 'Appuyez sur Echap, puis Tab, pour sortir.' };
    render(<BlockCanvas blocks={blocks} onChange={noop} labels={labels} />);
    expect(screen.getByRole('group', { name: 'Document' })).toHaveAccessibleDescription(labels.editorHint);
  });

  it('name the empty document host and the selection sink in the words the host gives', () => {
    render(<BlockCanvas blocks={[]} onChange={noop} labels={{ paragraph: 'Paragraphe', selectedContent: 'Contenu choisi' }} />);
    expect(screen.getByRole('textbox', { name: 'Paragraphe' })).toHaveAttribute('data-quoin-empty');
    expect(screen.getByRole('textbox', { name: 'Contenu choisi' })).toHaveAttribute('data-quoin-sink');
  });

  it('give way to an aria-label the host sets on the canvas', () => {
    render(<BlockCanvas blocks={blocks} onChange={noop} labels={{ document: 'Document' }} aria-label="Notes" />);
    expect(screen.getByRole('group', { name: 'Notes' })).toBeInTheDocument();
  });
});
