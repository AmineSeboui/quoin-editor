import { render, screen, waitFor } from '@testing-library/react';
import type { QuoinBlock } from '../../engine';
import { mountTypingCanvas } from '../typing-test-canvas';
import { QuoinSource } from './QuoinSource';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

const DOC = [md('a', '# Title'), md('b', 'A paragraph.'), md('c', '- one')];

const mountPane = (blocks: QuoinBlock[] = DOC) => {
  const canvas = mountTypingCanvas(blocks);
  render(<QuoinSource controller={canvas.handle().controller} />);
  return canvas;
};

const pane = () => screen.getByRole('region', { name: 'Markdown source' });
const lines = () => [...pane().querySelectorAll('[data-quoin-source-line]')];
const marked = () => lines().filter((line) => line.classList.contains('quoin-source-active'));

describe('QuoinSource', () => {
  it('is a region a reader can find by name', () => {
    mountPane();
    expect(pane()).toBeInTheDocument();
  });

  it('draws every line of the document markdown, in order', () => {
    mountPane();
    expect(lines().map((line) => line.textContent)).toEqual(['# Title', '', 'A paragraph.', '', '- one']);
  });

  it('marks the lines of the block holding the caret and no others', async () => {
    const canvas = mountPane();
    canvas.caret('b', 0);
    await waitFor(() => expect(marked().map((line) => line.textContent)).toEqual(['A paragraph.']));
  });

  it('moves the mark as the caret moves', async () => {
    const canvas = mountPane();
    canvas.caret('c', 0);
    await waitFor(() => expect(marked().map((line) => line.textContent)).toEqual(['- one']));
  });

  it('follows the document as it is typed into', async () => {
    const canvas = mountPane();
    canvas.caret('b', 12);
    canvas.type('!');
    await waitFor(() => expect(lines().map((line) => line.textContent)).toContain('A paragraph.!'));
  });

  it('takes a name the host gives it', () => {
    const canvas = mountTypingCanvas(DOC);
    render(<QuoinSource controller={canvas.handle().controller} labels={{ region: 'Le source' }} />);
    expect(screen.getByRole('region', { name: 'Le source' })).toBeInTheDocument();
  });

  it('draws nothing but an empty region for a document with no blocks', () => {
    mountPane([]);
    expect(lines()).toHaveLength(0);
  });

  it('writes the markdown the way the options passed to it ask for', () => {
    const blocks: QuoinBlock[] = [{ id: 'a', type: 'IMAGE', data: { storageKey: 'k1', alt: 'A picture' } }];
    const canvas = mountTypingCanvas(blocks);
    render(<QuoinSource controller={canvas.handle().controller} options={{ resolveAssetUrl: (key) => `https://cdn.test/${key}` }} />);
    expect(pane().textContent).toContain('https://cdn.test/k1');
  });
});
