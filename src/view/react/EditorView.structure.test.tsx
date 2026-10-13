import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { blockRangeSelection } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { useViewController } from './editor-context';
import { Editor, hostOf, md } from './test-harness';

const dividers = [md('a', 'one'), { id: 'd', type: 'DIVIDER', data: {} }, md('c', 'three')];

function mount(blocks = dividers, view: Parameters<typeof Editor>[0]['view'] = {}) {
  let controller!: ViewController;
  const view_ = render(
    <Editor options={{ blocks, onChange: () => {} }} view={view} onController={(c) => (controller = c)} />,
  );
  return { ...view_, controller };
}

describe('EditorView root', () => {
  it('is a labelled group whose class, id and hint are the caller\'s to extend', () => {
    const { container } = mount(dividers, { className: 'host-class', id: 'doc' });
    const root = screen.getByRole('group', { name: 'Doc' });
    expect(root).toBe(container.firstElementChild);
    expect(root).toHaveClass('quoin', 'quoin-editor', 'host-class');
    expect(root).toHaveAttribute('id', 'doc');
    const hint = document.getElementById(root.getAttribute('aria-describedby')!);
    expect(hint).toHaveTextContent('Type / for commands. Press Escape, then Tab, to leave the editor.');
  });

  it('attaches the controller to the root while mounted', () => {
    const { controller } = mount();
    expect(controller.root).toBe(screen.getByRole('group', { name: 'Doc' }));
  });

  it('renders one shell per block carrying its identity, kind and indent', () => {
    const blocks = [md('a', '- item'), md('b', 'child', 2)];
    const { container } = mount(blocks);
    const shells = container.querySelectorAll<HTMLElement>('[data-quoin-block]');
    expect(Array.from(shells, (shell) => shell.dataset.blockId)).toEqual(['a', 'b']);
    expect(shells[0].dataset).toMatchObject({ type: 'MARKDOWN', kind: 'bullet', indent: '0' });
    expect(shells[1].dataset).toMatchObject({ kind: 'paragraph', indent: '2' });
    expect(shells[1].style.getPropertyValue('--quoin-indent')).toBe('2');
    expect(shells[1]).toHaveAttribute('tabindex', '-1');
  });

  it('gives a block of a type without a kind no data-kind', () => {
    const { container } = mount();
    expect(container.querySelector('[data-type="DIVIDER"]')).not.toHaveAttribute('data-kind');
  });

  it('registers each shell with the controller and forgets it when the block goes', () => {
    const { controller, container } = mount();
    expect(controller.blockElement('d')).toBe(container.querySelector('[data-block-id="d"]'));
    act(() => void controller.editor.setBlocks([md('a', 'one')]));
    expect(controller.blockElement('d')).toBeUndefined();
  });

  it('registers each host so the controller can find its element', () => {
    const { controller, container } = mount();
    expect(controller.registry.get('a', 'text')).toBe(hostOf(container, 'a'));
  });
});

describe('EditorView selection', () => {
  it('marks selected shells and announces how many blocks are selected', () => {
    const { controller, container } = mount();
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(blockRangeSelection('a', 'd'))));
    const selected = container.querySelectorAll('[data-quoin-block][aria-selected="true"]');
    expect(Array.from(selected, (shell) => (shell as HTMLElement).dataset.blockId)).toEqual(['a', 'd']);
    expect(status).toHaveTextContent('2 blocks selected');
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(blockRangeSelection('c'))));
    expect(status).toHaveTextContent('1 block selected');
  });

  it('shows no selection state while a caret is in text', () => {
    const { container } = mount();
    expect(container.querySelector('[aria-selected]')).toBeNull();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});

describe('EditorView empty document', () => {
  it('shows one labelled placeholder host and no blocks', () => {
    const { container } = mount([], { placeholder: 'Start writing' });
    const host = screen.getByRole('textbox', { name: 'Paragraph' });
    expect(host).toHaveAttribute('data-placeholder', 'Start writing');
    expect(host.querySelector('br[data-quoin-filler]')).not.toBeNull();
    expect(container.querySelector('[data-quoin-block]')).toBeNull();
  });

  it('turns the first typed character into a paragraph and moves the caret into it', () => {
    const { controller, container } = mount([]);
    const host = screen.getByRole('textbox', { name: 'Paragraph' });
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data: 'H', cancelable: true, bubbles: true });
    act(() => void host.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(controller.editor.getBlocks().map((block) => block.data.markdown)).toEqual(['H']);
    expect(container.querySelectorAll('[data-quoin-block]')).toHaveLength(1);
    expect(document.activeElement).toBe(hostOf(container, controller.editor.state.doc.blocks[0].id));
    expect(hostOf(container, controller.editor.state.doc.blocks[0].id)).toHaveTextContent('H');
  });

  it('records that first character as typed input, through the editor\'s own insertText', () => {
    const origins: string[] = [];
    render(
      <Editor options={{ blocks: [], onChange: () => {}, onTransaction: (tr) => origins.push(tr.origin) }} />,
    );
    const host = screen.getByRole('textbox', { name: 'Paragraph' });
    act(() => void host.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'a', cancelable: true })));
    expect(origins).toContain('input');
  });

  it('handles that first character once: no listener further up sees the event again', () => {
    const { controller } = mount([]);
    const above: Event[] = [];
    screen.getByRole('group', { name: 'Doc' }).addEventListener('beforeinput', (event) => above.push(event));
    const host = screen.getByRole('textbox', { name: 'Paragraph' });
    act(() => void host.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'a', cancelable: true, bubbles: true })));
    expect(above).toHaveLength(0);
    expect(controller.editor.getBlocks().map((block) => block.data.markdown)).toEqual(['a']);
  });

  it('does not touch composition or other input types', () => {
    const { controller } = mount([]);
    const host = screen.getByRole('textbox', { name: 'Paragraph' });
    const composing = new InputEvent('beforeinput', { inputType: 'insertText', data: 'a', isComposing: true, cancelable: true });
    const other = new InputEvent('beforeinput', { inputType: 'insertFromPaste', data: 'a', cancelable: true });
    act(() => void host.dispatchEvent(composing));
    act(() => void host.dispatchEvent(other));
    expect(composing.defaultPrevented).toBe(false);
    expect(other.defaultPrevented).toBe(false);
    expect(controller.editor.state.doc.blocks).toHaveLength(0);
  });

  it('focuses the host on click', () => {
    mount([]);
    const host = screen.getByRole('textbox', { name: 'Paragraph' });
    act(() => host.click());
    expect(document.activeElement).toBe(host);
  });

  it('shows no placeholder and refuses typing while read-only', () => {
    let controller!: ViewController;
    render(<Editor options={{ blocks: [], onChange: () => {}, readOnly: true }} view={{ placeholder: 'Start' }} onController={(c) => (controller = c)} />);
    const host = screen.getByRole('textbox', { name: 'Paragraph' });
    expect(host).toHaveAttribute('contenteditable', 'false');
    expect(host).not.toHaveAttribute('data-placeholder');
    expect(controller.readOnly).toBe(true);
  });

  it('follows read-only while the document stays empty', () => {
    const onChange = vi.fn();
    const typeA = (host: HTMLElement) =>
      act(() => void host.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'a', cancelable: true })));
    const options = (readOnly: boolean) => ({ blocks: [], onChange, readOnly });
    const view = { placeholder: 'Start' };
    const { rerender } = render(<Editor options={options(false)} view={view} />);
    let host = screen.getByRole('textbox', { name: 'Paragraph' });
    expect(host).toHaveAttribute('contenteditable', 'true');
    expect(host).toHaveAttribute('data-placeholder', 'Start');

    rerender(<Editor options={options(true)} view={view} />);
    host = screen.getByRole('textbox', { name: 'Paragraph' });
    expect(host).toHaveAttribute('contenteditable', 'false');
    expect(host).not.toHaveAttribute('data-placeholder');
    typeA(host);
    expect(onChange).not.toHaveBeenCalled();

    rerender(<Editor options={options(false)} view={view} />);
    host = screen.getByRole('textbox', { name: 'Paragraph' });
    expect(host).toHaveAttribute('contenteditable', 'true');
    expect(host).toHaveAttribute('data-placeholder', 'Start');
    typeA(host);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('refuses the first character when the flag turns read-only under a host that is still editable', () => {
    const { controller } = mount([]);
    const host = screen.getByRole('textbox', { name: 'Paragraph' });
    act(() => controller.setReadOnly(true));
    host.contentEditable = 'true';
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data: 'a', cancelable: true });
    act(() => void host.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(false);
    expect(controller.editor.state.doc.blocks).toHaveLength(0);
  });
});

describe('useViewController', () => {
  it('throws when it is called outside an EditorView', () => {
    function Lost() {
      useViewController();
      return null;
    }
    const quiet = () => {};
    const original = console.error;
    console.error = quiet;
    try {
      expect(() => render(<Lost />)).toThrow('inside an EditorView');
    } finally {
      console.error = original;
    }
  });
});
