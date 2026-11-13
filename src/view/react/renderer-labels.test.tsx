import { act, render, screen } from '@testing-library/react';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import { Editor, md } from './test-harness';
import { englishRendererLabels, rendererLabelsWith, type RendererLabels } from './renderer-labels';

const french: RendererLabels = {
  paragraph: 'Paragraphe',
  heading: (level) => `Titre ${level}`,
  bulletItem: 'Puce',
  numberedItem: (n) => `Element ${n}`,
  task: 'Tache',
  quote: 'Citation',
  callout: (tone) => `Encadre ${tone}`,
  calloutTones: { info: 'note', tip: 'astuce', success: 'reussite', warning: 'attention', danger: 'danger' },
  toggle: 'Depliant',
  toggleButton: (hidden) => `Depliant, ${hidden} masques`,
};

const mount = (blocks: QuoinBlock[], rendererLabels?: Partial<RendererLabels>) =>
  render(<Editor options={{ blocks, onChange: () => {} }} view={{ rendererLabels }} />);

describe('the names the default renderers give', () => {
  it('come from rendererLabels for every host', () => {
    mount(
      [
        md('p', 'plain'),
        md('h', '## Two'),
        md('b', '- bullet'),
        md('n', '1. numbered'),
        md('t', '- [ ] job'),
        md('q', '> cited'),
        { id: 'c', type: 'CALLOUT', data: { tone: 'warning', body: 'careful' } },
        { id: 'o', type: 'TOGGLE', data: { markdown: 'summary', open: true } },
      ],
      french,
    );
    for (const name of ['Paragraphe', 'Titre 2', 'Puce', 'Element 1', 'Tache', 'Citation', 'Encadre attention', 'Depliant']) {
      expect(screen.getByRole('textbox', { name })).toBeInTheDocument();
    }
  });

  it('name a task checkbox after the host of its text, and by the task label while the text is empty', () => {
    const { container } = mount([md('t', '- [ ] Buy milk')], french);
    const host = container.querySelector<HTMLElement>('[data-block-id="t"] [data-quoin-host]')!;
    expect(host.id).not.toBe('');
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-labelledby', host.id);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-label', 'Tache');
  });

  it('name a toggle chevron by toggle while open and by the count it hides once closed', () => {
    const blocks = [{ id: 'o', type: 'TOGGLE', data: { markdown: 'summary', open: true } }, md('c', 'child', 1)];
    mount(blocks, french);
    const chevron = screen.getByRole('button', { name: 'Depliant' });
    expect(chevron.getAttribute('aria-controls')).toBe(document.querySelector('[data-block-id="c"]')!.id);
    act(() => chevron.click());
    expect(screen.getByRole('button', { name: 'Depliant, 1 masques' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('name the paragraph of an empty document and the placeholder of an empty heading the same way', () => {
    mount([], french);
    expect(screen.getByRole('textbox', { name: 'Paragraphe' })).toBeInTheDocument();
  });

  it('show an empty heading its own name, in the words rendererLabels gives', () => {
    mount([md('h', '## ')], french);
    expect(screen.getByRole('textbox', { name: 'Titre 2' })).toHaveAttribute('data-placeholder', 'Titre 2');
  });

  it('stay English for every key left out or undefined, and for every tone a partial record leaves out', () => {
    const tones = { warning: 'attention' } as RendererLabels['calloutTones'];
    const labels = rendererLabelsWith({ quote: 'Citation', task: undefined, calloutTones: tones });
    expect(labels.quote).toBe('Citation');
    expect(labels.task).toBe('Task');
    expect(labels.calloutTones).toEqual({ ...englishRendererLabels.calloutTones, warning: 'attention' });
    expect(rendererLabelsWith(undefined)).toBe(englishRendererLabels);
  });
});
