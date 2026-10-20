import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { coreBlocks } from '../../blocks/core';
import { paragraph } from '../../blocks/void/test-canvas';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import { textSelection } from '../../engine';
import { mentionExtension } from './mention-extension';
import { mountMentions } from './mention-test-canvas';

const LINE = 'Ask [@Ada](mention:user:42) today';
const at = (offset: number) => ({ block: 'p', region: 'text', offset });

function lineWithChip(options: Parameters<typeof mountMentions>[1] = {}, canvas: Parameters<typeof mountMentions>[2] = {}) {
  const mounted = mountMentions([paragraph('p', LINE), paragraph('q', 'Below')], options, canvas);
  return { ...mounted, theChip: () => mounted.chip('p')! };
}

describe('a mention chip', () => {
  it('draws @ and its label as text, with its kind and a description that names it, and is no link', () => {
    const { theChip } = lineWithChip();
    expect(theChip()).toHaveTextContent('@Ada');
    expect(theChip()).toHaveAttribute('data-kind', 'user');
    expect(theChip()).toHaveAttribute('aria-description', 'Mention, user');
    expect(theChip()).toHaveAttribute('contenteditable', 'false');
    expect(theChip()).not.toHaveAttribute('href');
    expect(theChip().closest('a')).toBeNull();
  });

  it('is described as a mention alone when it has no kind', () => {
    const canvas = mountMentions([paragraph('p', 'Ask [@Ada](mention:42)')]);
    expect(canvas.chip('p')).toHaveAttribute('aria-description', 'Mention');
    expect(canvas.chip('p')).not.toHaveAttribute('data-kind');
  });

  it('draws a label from the host as text', () => {
    const canvas = mountMentions([paragraph('p', 'Ask')]);
    canvas.caret('p', 3);
    act(() => void canvas.handle().editor.commands.insertMention({ id: '1', label: '<img src=x onerror=alert(1)>' }));
    expect(canvas.chip('p')).toHaveTextContent('@<img src=x onerror=alert(1)>');
    expect(canvas.chip('p')!.querySelector('*')).toBeNull();
  });

  it('calls onOpen with the mention on a click, on an editable or a read-only canvas, but not on a Shift+click', () => {
    const onOpen = vi.fn();
    const editable = lineWithChip({ onOpen });
    expect(editable.theChip()).toHaveAttribute('data-opens');
    fireEvent.click(editable.theChip(), { shiftKey: true });
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(editable.theChip());
    expect(onOpen).toHaveBeenCalledWith({ id: '42', label: 'Ada', kind: 'user' });

    const readOnly = mountMentions([paragraph('r', 'See [@Bob](mention:7)')], { onOpen }, { readOnly: true });
    fireEvent.click(readOnly.chip('r')!);
    expect(onOpen).toHaveBeenLastCalledWith({ id: '7', label: 'Bob' });
    expect(readOnly.changes).toEqual([]);
  });

  it('calls onOpen on Enter while selected, by a first Backspace or a selection over it, and not with the caret after it', () => {
    const onOpen = vi.fn();
    const canvas = lineWithChip({ onOpen });
    canvas.caret('p', 5);
    canvas.key('Enter');
    expect(onOpen).not.toHaveBeenCalled();
    expect(canvas.last().map((block) => block.data.markdown)).toEqual(['Ask [@Ada](mention:user:42)', '&#32;today', 'Below']);
    act(() => void canvas.handle().editor.commands.undo());

    canvas.caret('p', 5);
    canvas.key('Backspace');
    canvas.key('Enter');
    expect(onOpen).toHaveBeenCalledWith({ id: '42', label: 'Ada', kind: 'user' });

    const { controller } = canvas.handle();
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(at(5), at(4)))));
    canvas.key('Enter');
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(canvas.markdown('p')).toBe(LINE);
  });

  it('calls onOpen once for a double click', () => {
    const onOpen = vi.fn();
    const { theChip } = lineWithChip({ onOpen });
    fireEvent.click(theChip(), { detail: 1 });
    fireEvent.click(theChip(), { detail: 2 });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('is a button in the tab order on a read-only canvas with onOpen, which Enter and Space open', () => {
    const onOpen = vi.fn();
    const { theChip, changes } = lineWithChip({ onOpen }, { readOnly: true });
    expect(theChip()).toHaveAttribute('role', 'button');
    expect(theChip()).toHaveAttribute('tabindex', '0');
    expect(theChip()).toHaveAccessibleName('@Ada');
    expect(theChip()).toHaveAccessibleDescription('Mention, user');
    expect(theChip().closest('a')).toBeNull();
    act(() => theChip().focus());
    expect(fireEvent.keyDown(theChip(), { key: 'Enter' })).toBe(false);
    expect(fireEvent.keyDown(theChip(), { key: ' ' })).toBe(false);
    fireEvent.keyDown(theChip(), { key: 'Enter', ctrlKey: true });
    expect(onOpen.mock.calls).toEqual([[{ id: '42', label: 'Ada', kind: 'user' }], [{ id: '42', label: 'Ada', kind: 'user' }]]);
    expect(changes).toEqual([]);
  });

  it('is no button on an editable canvas, nor on a read-only one without onOpen', () => {
    const editable = lineWithChip({ onOpen: vi.fn() });
    expect(editable.theChip()).not.toHaveAttribute('role');
    expect(editable.theChip()).not.toHaveAttribute('tabindex');
    cleanup();
    const plain = lineWithChip({}, { readOnly: true });
    expect(plain.theChip()).not.toHaveAttribute('role');
    expect(plain.theChip()).not.toHaveAttribute('tabindex');
  });

  it('becomes a button as the canvas turns read-only, for chips drawn later too, and stops being one as it turns editable', async () => {
    const onOpen = vi.fn();
    const extensions = [mentionExtension({ onOpen })];
    function Host({ readOnly, markdown }: { readOnly: boolean; markdown: string }) {
      return (
        <BlockCanvas blocks={[paragraph('p', markdown)]} onChange={() => {}} blockTypes={coreBlocks} extensions={extensions} readOnly={readOnly} />
      );
    }
    const chips = () => Array.from(document.querySelectorAll('[data-quoin-atom="mention"]'));
    const { rerender } = render(<Host readOnly={false} markdown={LINE} />);
    expect(chips().map((chip) => chip.getAttribute('role'))).toEqual([null]);
    rerender(<Host readOnly markdown={LINE} />);
    expect(chips().map((chip) => chip.getAttribute('role'))).toEqual(['button']);
    rerender(<Host readOnly markdown={`${LINE} and [@Bob](mention:7)`} />);
    await waitFor(() => expect(chips().map((chip) => chip.getAttribute('role'))).toEqual(['button', 'button']));
    rerender(<Host readOnly={false} markdown={`${LINE} and [@Bob](mention:7)`} />);
    expect(chips().map((chip) => [chip.getAttribute('role'), chip.getAttribute('tabindex')])).toEqual([
      [null, null],
      [null, null],
    ]);
  });

  it('is not interactive without onOpen', () => {
    const canvas = lineWithChip();
    expect(canvas.theChip()).not.toHaveAttribute('data-opens');
    canvas.caret('p', 5);
    canvas.key('Backspace');
    canvas.key('Enter');
    expect(canvas.last().map((block) => block.data.markdown)).toEqual(['Ask&#32;', '&#32;today', 'Below']);
  });

  it('is selected with a highlight by a first Backspace, and deleted by a second', () => {
    const canvas = lineWithChip();
    canvas.caret('p', 5);
    canvas.key('Backspace');
    expect(canvas.selection()).toEqual(textSelection(at(4), at(5)));
    expect(canvas.theChip().closest('[data-quoin-selected-atom]')).not.toBeNull();
    canvas.key('Backspace');
    expect(canvas.markdown('p')).toBe('Ask  today');
  });

  it('is selected exactly by Shift+ArrowLeft right after it at the end of a line', () => {
    const canvas = mountMentions([paragraph('p', 'Ask [@Ada](mention:42)')]);
    canvas.caret('p', 5);
    canvas.key('ArrowLeft', { shiftKey: true });
    expect(canvas.selection()).toEqual(textSelection(at(5), at(4)));
  });

  it('has no accessibility violations, editable or read-only', async () => {
    expect(await axe(lineWithChip({ onOpen: vi.fn() }).container)).toHaveNoViolations();
    expect(await axe(lineWithChip({ onOpen: vi.fn() }, { readOnly: true }).container)).toHaveNoViolations();
  });
});
