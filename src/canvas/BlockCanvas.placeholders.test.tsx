import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import type { QuoinBlock } from '../types';
import { BlockCanvas } from './BlockCanvas';

const callout: QuoinBlock = { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: '' } };
const toggle: QuoinBlock = { id: 't', type: 'TOGGLE', data: { markdown: '', open: true } };

const empties = [
  paragraph('h', '## '),
  paragraph('b', '- '),
  paragraph('k', '- [ ] '),
  paragraph('q', '> '),
  callout,
  toggle,
  paragraph('p', ''),
  paragraph('r', ''),
];

function placeholders(container: HTMLElement): Record<string, string | null> {
  const shells = container.querySelectorAll<HTMLElement>('[data-block-id]');
  return Object.fromEntries(
    Array.from(shells, (shell) => [
      shell.dataset.blockId,
      shell.querySelector('[data-quoin-host]')?.getAttribute('data-placeholder') ?? null,
    ]),
  );
}

describe('the placeholders of the canvas', () => {
  it('name each empty block by its kind, and offer the slash menu only in the paragraph holding the caret', () => {
    const { container, handle } = mountCanvas(empties);
    act(() => handle().focus({ block: 'p', region: 'text', offset: 0 }));
    expect(placeholders(container)).toEqual({
      h: 'Heading 2',
      b: 'List',
      k: 'List',
      q: 'Quote',
      c: 'Callout',
      t: 'Toggle',
      p: "Type '/' for commands",
      r: null,
    });
    act(() => handle().focus({ block: 'r', region: 'text', offset: 0 }));
    expect(placeholders(container)).toMatchObject({ p: null, r: "Type '/' for commands" });
  });

  it("take the canvas's placeholder in place of the slash hint", () => {
    const { container, handle } = mountCanvas(empties, { placeholder: 'Write something' });
    act(() => handle().focus({ block: 'p', region: 'text', offset: 0 }));
    expect(placeholders(container)).toMatchObject({ h: 'Heading 2', p: 'Write something' });
  });

  it('offer the slash menu on the host of an empty document', () => {
    render(<BlockCanvas blocks={[]} onChange={() => {}} />);
    expect(screen.getByRole('textbox', { name: 'Paragraph' })).toHaveAttribute('data-placeholder', "Type '/' for commands");
  });
});
