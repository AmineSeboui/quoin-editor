import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { defineExtension } from '../engine';
import type { QuoinBlock } from '../types';
import { BlockCanvas } from './BlockCanvas';
import type { QuoinEditorHandle } from './canvas-props';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });
const blocks: QuoinBlock[] = [
  md('h', '# Title'),
  md('p', 'Some **bold** text.'),
  { id: 'c', type: 'CALLOUT', data: { tone: 'warning', body: 'Mind the gap.' } },
];

const hosts = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>('[data-quoin-host]'));

describe('BlockCanvas', () => {
  it('draws every block as an editable host with its kind', () => {
    const { container } = render(<BlockCanvas blocks={blocks} onChange={() => {}} />);
    expect(screen.getByRole('textbox', { name: 'Heading 1' })).toHaveTextContent('Title');
    expect(screen.getByRole('textbox', { name: 'Paragraph' }).innerHTML).toBe('Some <strong>bold</strong> text.');
    expect(screen.getByText('Mind the gap.')).toBeInTheDocument();
    expect(hosts(container).every((host) => host.contentEditable === 'true')).toBe(true);
  });

  it('is a group named Editor unless the host names it', () => {
    const { rerender } = render(<BlockCanvas blocks={blocks} onChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'Editor' })).toBeInTheDocument();
    rerender(<BlockCanvas blocks={blocks} onChange={() => {}} aria-label="Notes" />);
    expect(screen.getByRole('group', { name: 'Notes' })).toBeInTheDocument();
  });

  it('adds the host class to its own scope class and forwards the id', () => {
    render(<BlockCanvas blocks={blocks} onChange={() => {}} className="my-canvas" id="doc" aria-label="Notes" />);
    const root = screen.getByRole('group', { name: 'Notes' });
    expect(root).toHaveClass('quoin', 'my-canvas');
    expect(root).toHaveAttribute('id', 'doc');
  });

  it('runs the host extensions alongside the core ones', () => {
    const ref = createRef<QuoinEditorHandle>();
    const onTransaction = vi.fn();
    const extensions = [defineExtension({ name: 'spy', onTransaction })];
    render(<BlockCanvas ref={ref} blocks={blocks} onChange={() => {}} extensions={extensions} />);
    act(() => void ref.current!.editor.commands.selectAll());
    expect(onTransaction).toHaveBeenCalledTimes(1);
  });

  it('draws a block type it has no renderer for instead of dropping it, under a readable name', () => {
    const { container } = render(
      <BlockCanvas blocks={[md('a', 'before'), { id: 'z', type: 'CHART', data: {} }]} onChange={() => {}} />,
    );
    expect(container.querySelector('[data-block-id="z"]')).toHaveTextContent('Unsupported block');
  });

  it('shows the placeholder on the host of an empty document', () => {
    render(<BlockCanvas blocks={[]} onChange={() => {}} placeholder="Write something" />);
    expect(screen.getByRole('textbox', { name: 'Paragraph' })).toHaveAttribute('data-placeholder', 'Write something');
  });

  it('makes no host editable and reports nothing when read-only', () => {
    const onChange = vi.fn();
    const { container } = render(<BlockCanvas blocks={blocks} onChange={onChange} readOnly />);
    expect(hosts(container)).toHaveLength(3);
    for (const host of hosts(container)) expect(host).toHaveAttribute('contenteditable', 'false');
    const paragraph = screen.getByRole('textbox', { name: 'Paragraph' });
    act(() => paragraph.focus());
    fireEvent(paragraph, new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', bubbles: true, cancelable: true }));
    fireEvent.keyDown(paragraph, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('makes the empty document host read-only too', () => {
    render(<BlockCanvas blocks={[]} onChange={() => {}} readOnly placeholder="Write something" />);
    const host = screen.getByRole('textbox', { name: 'Paragraph' });
    expect(host).toHaveAttribute('contenteditable', 'false');
    expect(host).not.toHaveAttribute('data-placeholder');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<BlockCanvas blocks={blocks} onChange={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations when read-only', async () => {
    const { container } = render(<BlockCanvas blocks={blocks} onChange={() => {}} readOnly />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
