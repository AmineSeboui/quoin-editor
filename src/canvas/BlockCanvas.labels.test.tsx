import { render, screen } from '@testing-library/react';
import { defineExtension } from '../engine';
import type { QuoinLabels } from '../i18n/labels';
import { useLabels } from '../i18n/use-labels';
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

  it('stay the same object while a host passes equal labels written inline on each render', () => {
    const seen = new Set<QuoinLabels>();
    function LabelProbe() {
      seen.add(useLabels());
      return null;
    }
    const extensions = [defineExtension({ name: 'probe', ui: { overlays: [LabelProbe] } })];
    const draw = (document: string) => (
      <BlockCanvas
        blocks={blocks}
        onChange={noop}
        extensions={extensions}
        labels={{ document, blockNames: { paragraph: 'Paragraphe' } }}
      />
    );
    const { rerender } = render(draw('Document'));
    rerender(draw('Document'));
    rerender(draw('Document'));
    expect(seen.size).toBe(1);
    rerender(draw('Notes'));
    expect(seen.size).toBe(2);
    expect(screen.getByRole('group', { name: 'Notes' })).toBeInTheDocument();
  });
});
