import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { QuoinBlock } from '../../engine';
import { Editor, md } from './test-harness';

const blocks: QuoinBlock[] = [md('a', 'one'), { id: 't', type: 'TOGGLE', data: { markdown: 'T', open: true } }];
const options = (readOnly: boolean, content: QuoinBlock[] = blocks) => ({ blocks: content, onChange: () => {}, readOnly });
const textboxes = () => screen.getAllByRole('textbox', { hidden: true });

describe('read-only textboxes', () => {
  it('announce themselves as read-only: block hosts, the selection sink and the empty document host', () => {
    const { unmount } = render(<Editor options={options(true)} />);
    expect(textboxes().length).toBeGreaterThanOrEqual(3);
    for (const box of textboxes()) expect(box).toHaveAttribute('aria-readonly', 'true');
    unmount();
    render(<Editor options={options(true, [])} />);
    expect(textboxes().map((box) => box.getAttribute('aria-readonly'))).toEqual(['true', 'true']);
  });

  it('carry no aria-readonly while the editor can be edited', () => {
    render(<Editor options={options(false)} />);
    for (const box of textboxes()) expect(box).not.toHaveAttribute('aria-readonly');
  });

  it('follow the flag in both directions', () => {
    const { rerender } = render(<Editor options={options(false)} />);
    const host = screen.getByRole('textbox', { name: 'Paragraph' });
    expect(host).not.toHaveAttribute('aria-readonly');
    rerender(<Editor options={options(true)} />);
    expect(host).toHaveAttribute('aria-readonly', 'true');
    expect(host).toHaveAttribute('contenteditable', 'false');
    rerender(<Editor options={options(false)} />);
    expect(host).not.toHaveAttribute('aria-readonly');
    expect(host).toHaveAttribute('contenteditable', 'true');
  });
});

describe('the editor group', () => {
  it('is labelled "Editor" when the caller gives no label, and keeps a label it is given', () => {
    const { rerender } = render(<Editor options={options(false)} view={{ 'aria-label': undefined }} />);
    expect(screen.getByRole('group', { name: 'Editor' })).toBeInTheDocument();
    rerender(<Editor options={options(false)} view={{ 'aria-label': 'Meeting notes' }} />);
    expect(screen.getByRole('group', { name: 'Meeting notes' })).toBeInTheDocument();
  });

  it('describes only the way out of the editor, since the headless editor has no "/" commands', () => {
    render(<Editor options={options(false)} />);
    const group = screen.getByRole('group', { name: 'Doc' });
    const hint = document.getElementById(group.getAttribute('aria-describedby')!);
    expect(hint).toHaveTextContent('Press Escape, then Tab, to leave the editor.');
    expect(hint?.textContent).not.toContain('/');
  });
});
