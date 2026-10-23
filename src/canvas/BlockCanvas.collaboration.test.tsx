import { StrictMode, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { applyRemote } from '../engine/collab/apply-remote';
import { collaborationExtension } from '../engine/collab/collaboration-extension';
import type { CollaborationAdapter } from '../engine/collab/adapter';
import { text } from '../engine/model/inline';
import { replaceInlineStep } from '../engine/transform/replace-inline-step';
import type { QuoinBlock } from '../types';
import { BlockCanvas } from './BlockCanvas';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

afterEach(() => vi.restoreAllMocks());

describe('BlockCanvas with a collaboration extension', () => {
  it('connects once per mount under StrictMode, seeds after commit and disconnects on unmount', () => {
    const error = vi.spyOn(console, 'error');
    const warn = vi.spyOn(console, 'warn');
    const live = new Set<number>();
    let connections = 0;
    const adapter: CollaborationAdapter = {
      connect(editor) {
        const id = ++connections;
        live.add(id);
        const length = String(editor.getBlocks()[0].data.markdown).length;
        applyRemote(editor, [replaceInlineStep('a', 'text', 0, length, [text('shared')])]);
        return () => void live.delete(id);
      },
      onLocalTransaction: () => undefined,
    };
    const extensions = [collaborationExtension(adapter)];
    let rendering = false;
    const changedWhileRendering = vi.fn();
    function RenderDone() {
      rendering = false;
      return null;
    }
    function Host() {
      rendering = true;
      const [blocks, setBlocks] = useState([md('a', 'hello')]);
      return (
        <>
          <BlockCanvas
            blocks={blocks}
            extensions={extensions}
            onChange={(next) => {
              if (rendering) changedWhileRendering();
              setBlocks(next);
            }}
          />
          <RenderDone />
        </>
      );
    }

    const { unmount } = render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    expect(live.size).toBe(1);
    expect(connections).toBeGreaterThan(1);
    expect(screen.getByRole('textbox', { name: 'Paragraph' })).toHaveTextContent(/^shared$/);
    expect(changedWhileRendering).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();

    unmount();
    expect(live.size).toBe(0);
  });
});
