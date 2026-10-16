import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import { defineExtension } from '../../engine';
import type { ExtensionUI } from '../../extensions/ui-types';
import { replaceTrigger } from '../suggestion/replace-trigger';

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

function openCanvas(props: Parameters<typeof mountCanvas>[1] = {}) {
  const canvas = mountCanvas([paragraph('a', '')], props);
  act(() => canvas.handle().focus('start'));
  const host = () => canvas.shell('a').querySelector<HTMLElement>('[data-quoin-host]')!;
  return { ...canvas, host };
}

const listbox = () => screen.queryByRole('listbox', { name: 'Commands' });
const activeOption = () => within(listbox()!).getByRole('option', { selected: true });
const markdown = (canvas: ReturnType<typeof openCanvas>) => canvas.last()?.map((block) => block.data.markdown);

describe('the slash menu', () => {
  it('filters as the query grows, walks with the arrows and turns the block into the chosen one', () => {
    const canvas = openCanvas();
    type('/hea');
    expect(activeOption()).toHaveTextContent('Heading 1');
    const host = canvas.host();
    expect(host).toHaveAttribute('aria-expanded', 'true');
    expect(host).toHaveAttribute('aria-controls', listbox()!.id);
    expect(host).toHaveAttribute('aria-autocomplete', 'list');
    expect(host.getAttribute('aria-activedescendant')).toBe(activeOption().id);

    fireEvent.keyDown(host, { key: 'ArrowDown' });
    expect(activeOption()).toHaveTextContent('Heading 2');
    expect(host.getAttribute('aria-activedescendant')).toBe(activeOption().id);

    fireEvent.keyDown(host, { key: 'Enter' });
    expect(markdown(canvas)).toEqual(['## ']);
    expect(listbox()).toBeNull();
    for (const attribute of ['aria-expanded', 'aria-controls', 'aria-autocomplete', 'aria-activedescendant']) {
      expect(host).not.toHaveAttribute(attribute);
      expect(canvas.host()).not.toHaveAttribute(attribute);
    }
    expect(canvas.host()).toHaveAttribute('role', 'textbox');
  });

  it('closes on Escape and leaves the slash and the query as text', () => {
    const canvas = openCanvas();
    type('/hea');
    fireEvent.keyDown(canvas.host(), { key: 'Escape' });
    expect(listbox()).toBeNull();
    expect(markdown(canvas)).toEqual(['/hea']);
    expect(canvas.selection()).toMatchObject({ kind: 'text', head: { block: 'a', offset: 4 } });
    expect(canvas.host()).toHaveAttribute('role', 'textbox');
    expect(canvas.host()).toHaveAttribute('aria-multiline', 'true');
    expect(canvas.host()).not.toHaveAttribute('aria-activedescendant');
    type('d');
    expect(listbox()).toBeNull();
  });

  it('leaves Enter to the text when no command matches', () => {
    const canvas = openCanvas();
    type('/zzz');
    expect(listbox()).not.toBeNull();
    fireEvent.keyDown(canvas.host(), { key: 'Enter' });
    expect(markdown(canvas)).toEqual(['/zzz', '']);
  });

  it('stays closed in a read-only canvas, whatever the caret follows', () => {
    const canvas = mountCanvas([paragraph('a', 'see /x')], { readOnly: true });
    act(() => canvas.handle().focus('end'));
    expect(canvas.selection()).toMatchObject({ head: { block: 'a', offset: 6 } });
    expect(listbox()).toBeNull();
  });

  it('never opens on a slash inside a word', () => {
    openCanvas();
    type('a/');
    expect(listbox()).toBeNull();
    type('b');
    expect(listbox()).toBeNull();
  });

  it('wraps the arrows round the list and jumps with Home and End', () => {
    const canvas = openCanvas();
    type('/hea');
    fireEvent.keyDown(canvas.host(), { key: 'ArrowUp' });
    expect(activeOption()).toHaveTextContent('Heading 3');
    fireEvent.keyDown(canvas.host(), { key: 'ArrowDown' });
    expect(activeOption()).toHaveTextContent('Heading 1');
    fireEvent.keyDown(canvas.host(), { key: 'End' });
    expect(activeOption()).toHaveTextContent('Heading 3');
    fireEvent.keyDown(canvas.host(), { key: 'Home' });
    expect(activeOption()).toHaveTextContent('Heading 1');
  });

  it('groups the commands under their headings and offers the custom block types last', () => {
    openCanvas();
    type('/');
    const groups = within(listbox()!).getAllByRole('group');
    expect(groups[0]).toHaveAccessibleName('Basic');
    expect(groups.at(-1)).toHaveAccessibleName('Custom');
    expect(within(groups.at(-1)!).getByRole('option', { name: /Bookmark/ })).toBeInTheDocument();
  });

  it('inserts a custom block type with its initial data in place of the empty paragraph', () => {
    const canvas = openCanvas();
    type('/bookm');
    expect(activeOption()).toHaveTextContent('Bookmark');
    fireEvent.keyDown(canvas.host(), { key: 'Tab' });
    expect(canvas.last()).toEqual([{ id: 'a', type: 'BOOKMARK', data: { url: 'new.example' } }]);
  });

  it('runs a command another extension adds, which replaces the slash and the query', () => {
    const ui: ExtensionUI = {
      slashItems: [
        {
          id: 'date',
          title: 'Today',
          group: 'basic',
          run: ({ controller, range }) => {
            replaceTrigger(controller, range);
            controller.edit(() => controller.editor.insertText('16 October'));
          },
        },
      ],
    };
    const canvas = openCanvas({ extensions: [defineExtension({ name: 'dates', ui })] });
    type('note /tod');
    fireEvent.keyDown(canvas.host(), { key: 'Enter' });
    expect(markdown(canvas)).toEqual(['note 16 October']);
  });

  it('selects an option on click and keeps the caret in the text', () => {
    const canvas = openCanvas();
    type('/bul');
    const option = within(listbox()!).getByRole('option', { name: /Bulleted list/ });
    expect(fireEvent.pointerDown(option)).toBe(false);
    fireEvent.click(option);
    expect(markdown(canvas)).toEqual(['- ']);
    expect(canvas.host()).toHaveFocus();
  });

  it('marks the option under the pointer as the active one', () => {
    openCanvas();
    type('/hea');
    fireEvent.pointerMove(within(listbox()!).getByRole('option', { name: /Heading 3/ }));
    expect(activeOption()).toHaveTextContent('Heading 3');
  });

  it('says how many commands match once the filtering settles, or that none does', async () => {
    openCanvas();
    type('/hea');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('3 results'));
    type('zz');
    expect(within(listbox()!).queryAllByRole('option')).toEqual([]);
    expect(listbox()!.parentElement).toHaveTextContent('No results');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No results'));
  });

  it('has no accessibility violations while open', async () => {
    const canvas = openCanvas();
    type('/');
    // The popover places itself once a promise settles, so the scans run inside act to take that update in.
    const text = await act(() => axe(canvas.container));
    const menu = await act(() => axe(listbox()!.parentElement!));
    expect(text).toHaveNoViolations();
    expect(menu).toHaveNoViolations();
  });
});
