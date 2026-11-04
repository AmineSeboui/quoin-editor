import { cleanup, screen } from '@testing-library/react';
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

afterEach(cleanup);

describe('diagramExtension', () => {
  it('draws the host markup for a configured language', () => {
    mount([code('a', 'mermaid', 'graph TD; a-->b')]);
    expect(drawn()?.innerHTML).toBe(SVG);
  });

  it('keeps the source of the diagram reachable, as the code block holds it', () => {
    mount([code('a', 'mermaid', 'graph TD; a-->b')]);
    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveValue('graph TD; a-->b');
  });

  it('hides the drawing from a screen reader, which reads the source instead', () => {
    mount([code('a', 'mermaid', 'graph TD')]);
    expect(drawn()).toHaveAttribute('aria-hidden', 'true');
  });

  it('names the block by the language that draws it', () => {
    mount([code('a', 'mermaid', 'graph TD')]);
    expect(screen.getByRole('group', { name: 'mermaid diagram' })).toBeInTheDocument();
  });

  it('leaves a language it does not draw to the code block', () => {
    mount([code('a', 'python', 'x = 1')]);
    expect(drawn()).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveValue('x = 1');
  });

  it('leaves a block with no language to the code block', () => {
    mount([code('a', '', 'plain')]);
    expect(drawn()).toBeNull();
  });

  it('shows the source alone when the renderer throws', () => {
    mount([code('a', 'mermaid', 'graph TD')], {
      render: () => {
        throw new Error('bad diagram');
      },
    });
    expect(drawn()).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveValue('graph TD');
  });

  it('shows the source alone when no renderer is given', () => {
    mount([code('a', 'mermaid', 'graph TD')], {});
    expect(drawn()).toBeNull();
  });

  it('draws the languages the host configures instead of the default', () => {
    mount([code('a', 'plantuml', '@startuml')], { render: () => SVG, languages: ['plantuml'] });
    expect(drawn()?.innerHTML).toBe(SVG);
  });

  it('leaves mermaid to the code block when the host configures another language', () => {
    mount([code('a', 'mermaid', 'graph TD')], { render: () => SVG, languages: ['plantuml'] });
    expect(drawn()).toBeNull();
  });

  it('redraws when the source changes', () => {
    const seen: string[] = [];
    const canvas = mount([code('a', 'mermaid', 'graph')], {
      render: (source) => (seen.push(source), SVG),
    });
    canvas.caret('a', 0);
    expect(seen).toContain('graph');
  });
});
