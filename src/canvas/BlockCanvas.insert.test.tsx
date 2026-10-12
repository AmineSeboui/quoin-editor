import * as React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Hash } from 'lucide-react';
import { BlockCanvas } from './BlockCanvas';
import { coreBlocks } from '../blocks/core';
import { defineBlock } from '../registry';
import type { QuoinBlock } from '../types';

const fieldBlock = defineBlock({
  type: 'FIELD',
  label: 'Field',
  icon: Hash,
  editor: () => <input aria-label="First canvas field" />,
  alwaysEditing: true,
});

describe('inserting a block', () => {
  const scrolled = vi.fn();

  beforeEach(() => {
    scrolled.mockClear();
    Element.prototype.scrollIntoView = scrolled;
  });

  afterEach(() => {
    // @ts-expect-error jsdom does not implement scrollIntoView, so the stub is removed
    delete Element.prototype.scrollIntoView;
  });

  it('focuses and scrolls the new block in its own canvas when another canvas shares the page', async () => {
    const user = userEvent.setup();
    render(
      <>
        <BlockCanvas
          aria-label="First"
          blocks={[{ id: 'f', type: 'FIELD', data: {} }]}
          onChange={() => {}}
          blockTypes={[...coreBlocks, fieldBlock]}
        />
        <BlockCanvas
          aria-label="Second"
          blocks={[{ id: 's', type: 'MARKDOWN', data: { markdown: 'second' } }]}
          onChange={() => {}}
        />
      </>,
    );
    const second = screen.getByRole('group', { name: 'Second' });

    await user.click(within(second).getByRole('button', { name: 'Insert a block at the start' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Markdown' }));
    await waitFor(() => expect(scrolled).toHaveBeenCalled());

    expect(second).toContainElement(scrolled.mock.contexts[0] as HTMLElement);
    expect(within(second).getAllByLabelText('Markdown')[0]).toHaveFocus();
  });

  it('leaves no editor open after the canvas goes read-only and back', async () => {
    const user = userEvent.setup();
    function Host() {
      const [current, setCurrent] = React.useState<QuoinBlock[]>([]);
      const [readOnly, setReadOnly] = React.useState(false);
      return (
        <>
          <button onClick={() => setReadOnly((value) => !value)}>toggle</button>
          <BlockCanvas blocks={current} onChange={setCurrent} readOnly={readOnly} />
        </>
      );
    }
    render(<Host />);
    await user.click(screen.getByRole('button', { name: 'Insert a block at the start' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Markdown' }));
    expect(screen.getByLabelText('Markdown')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'toggle' }));
    await user.click(screen.getByRole('button', { name: 'toggle' }));

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByLabelText('Markdown')).not.toBeInTheDocument();
  });

  it('leaves exactly one editor open when a block is inserted from the slash palette', async () => {
    const user = userEvent.setup();
    render(<BlockCanvas blocks={[{ id: 'a', type: 'MARKDOWN', data: { markdown: 'hello ' } }]} onChange={() => {}} />);
    await user.click(screen.getByText('hello'));
    const box = screen.getByLabelText('Markdown') as HTMLTextAreaElement;
    box.setSelectionRange(6, 6);
    fireEvent.keyDown(box, { key: '/' });

    fireEvent.click(screen.getByText('Code'));

    const list = screen.getByRole('list');
    expect(list.querySelectorAll('textarea')).toHaveLength(1);
    expect(within(list).getByLabelText('Language')).toHaveFocus();
  });

  it('keeps the caret where a starter command put it once the seed is spent', async () => {
    render(<BlockCanvas blocks={[]} onChange={() => {}} />);
    const starter = screen.getByLabelText('Write something');
    fireEvent.keyDown(starter, { key: '/' });

    fireEvent.click(screen.getByText('Code block'));

    const box = (await screen.findByLabelText('Markdown')) as HTMLTextAreaElement;
    await waitFor(() => expect(box).toHaveFocus());
    expect(box.value).toBe('```\n\n```');
    expect(box.selectionStart).toBe(3);
  });
});
