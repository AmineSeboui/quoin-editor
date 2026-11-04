import { act, cleanup, screen, waitFor } from '@testing-library/react';
import type { QuoinBlock } from '../../engine';
import { mountTypingCanvas } from '../typing-test-canvas';
import { diagramExtension, type DiagramOptions } from './diagram-extension';

// Written the way the DOM reads it back, so an exact comparison says what it looks like it says.
const SVG = '<svg data-drawn="yes"><rect></rect></svg>';

const code = (id: string, language: string, source: string): QuoinBlock => ({
  id,
  type: 'CODE',
  data: { language, code: source },
});

const mount = (blocks: QuoinBlock[], options: DiagramOptions = { render: () => SVG }) =>
  mountTypingCanvas(blocks, { extensions: [diagramExtension(options)] });

const drawn = () => document.querySelector('.quoin-diagram-output');
const source = () => screen.getByRole('textbox', { name: 'Code' });

/** A drawing arrives through a promise, so the chain is flushed before anything is asserted absent. */
const settled = () => act(async () => void (await Promise.resolve()));

afterEach(cleanup);

describe('diagramExtension', () => {
  it('draws the host markup for a configured language', async () => {
    mount([code('a', 'mermaid', 'graph TD; a-->b')]);
    await waitFor(() => expect(drawn()?.innerHTML).toBe(SVG));
  });

  it('waits for a renderer that answers with a promise', async () => {
    mount([code('a', 'mermaid', 'graph TD')], { render: async () => SVG });
    await waitFor(() => expect(drawn()?.innerHTML).toBe(SVG));
  });

  it('keeps the source of the diagram reachable, as the code block holds it', async () => {
    mount([code('a', 'mermaid', 'graph TD; a-->b')]);
    await waitFor(() => expect(drawn()).not.toBeNull());
    expect(source()).toHaveValue('graph TD; a-->b');
  });

  it('hides the drawing from a screen reader, which reads the source instead', async () => {
    mount([code('a', 'mermaid', 'graph TD')]);
    await waitFor(() => expect(drawn()).toHaveAttribute('aria-hidden', 'true'));
  });

  it('names the block by the language that draws it', async () => {
    mount([code('a', 'mermaid', 'graph TD')]);
    expect(await screen.findByRole('group', { name: 'mermaid diagram' })).toBeInTheDocument();
  });

  it('leaves a language it does not draw to the code block', async () => {
    mount([code('a', 'python', 'x = 1')]);
    await settled();
    expect(drawn()).toBeNull();
    expect(source()).toHaveValue('x = 1');
  });

  it('leaves a block with no language to the code block', async () => {
    mount([code('a', '', 'plain')]);
    await settled();
    expect(drawn()).toBeNull();
  });

  it('shows the source alone when the renderer throws', async () => {
    mount([code('a', 'mermaid', 'graph TD')], {
      render: () => {
        throw new Error('bad diagram');
      },
    });
    await settled();
    expect(drawn()).toBeNull();
    expect(source()).toHaveValue('graph TD');
  });

  it('shows the source alone when the renderer rejects', async () => {
    mount([code('a', 'mermaid', 'graph TD')], { render: () => Promise.reject(new Error('parse error')) });
    await settled();
    expect(drawn()).toBeNull();
  });

  it('shows the source alone when no renderer is given', async () => {
    mount([code('a', 'mermaid', 'graph TD')], {});
    await settled();
    expect(drawn()).toBeNull();
  });

  it('draws the languages the host configures instead of the default', async () => {
    mount([code('a', 'plantuml', '@startuml')], { render: () => SVG, languages: ['plantuml'] });
    await waitFor(() => expect(drawn()?.innerHTML).toBe(SVG));
  });

  it('leaves mermaid to the code block when the host configures another language', async () => {
    mount([code('a', 'mermaid', 'graph TD')], { render: () => SVG, languages: ['plantuml'] });
    await settled();
    expect(drawn()).toBeNull();
  });

});
