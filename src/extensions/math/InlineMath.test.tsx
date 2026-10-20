import { act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/void/test-canvas';
import { textSelection } from '../../engine';
import { domMapOf } from '../../view';
import { fakeRenderMath, mountMath } from './math-test-canvas';

const atomIn = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-quoin-atom="math"]')!;
const caretAt = (offset: number) => textSelection({ block: 'p', region: 'text', offset });

// Where the caret drawn in the line stands, as the next key will read it.
function drawnCaret(host: HTMLElement): number | null | undefined {
  const { focusNode, focusOffset } = document.getSelection()!;
  return focusNode === null ? null : domMapOf(host)?.fromDom(focusNode, focusOffset);
}

function lineWithFormula(options: Parameters<typeof mountMath>[1] = {}, canvas: Parameters<typeof mountMath>[2] = {}) {
  const mounted = mountMath([paragraph('p', 'Area $x^2$ here'), paragraph('q', 'Below')], options, canvas);
  return { ...mounted, formula: () => atomIn(mounted.host('p')) };
}

describe('an inline math formula', () => {
  it('draws the HTML of the host renderMath as it is, inline, as one character of the line', () => {
    const renderMath = vi.fn(fakeRenderMath);
    const { formula } = lineWithFormula({ renderMath });
    expect(renderMath).toHaveBeenCalledWith('x^2', { displayMode: false });
    expect(formula().querySelector('.fake-math')).toHaveAttribute('data-display', 'false');
    expect(formula()).toHaveAttribute('contenteditable', 'false');
    expect(formula().closest('[aria-label]')).not.toBe(formula());
  });

  it('without renderMath the source shows as text', () => {
    const { formula } = lineWithFormula();
    expect(formula()).toHaveTextContent('x^2');
    expect(formula()).toHaveClass('quoin-math-source');
    expect(formula().querySelector('*')).toBeNull();
  });

  it('shows its source when renderMath throws', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { formula, host } = lineWithFormula({
      renderMath: () => {
        throw new Error('KaTeX parse error');
      },
    });
    expect(formula()).toHaveTextContent('x^2');
    expect(host('q')).toHaveTextContent('Below');
    vi.restoreAllMocks();
  });

  it('is typed with dollars, the input rule converting it as the closing dollar lands', () => {
    const canvas = mountMath([paragraph('p', 'Area')], { renderMath: fakeRenderMath });
    canvas.caret('p', 4);
    canvas.type(' $y^3$');
    expect(canvas.markdown('p')).toBe('Area $y^3$');
    expect(atomIn(canvas.host('p')).querySelector('.fake-math')).toHaveTextContent('y^3');
    expect(canvas.selection()).toEqual(caretAt(6));
  });

  it('popover edits latex on a click: Enter stores it as one undo step, Shift+Enter breaks the line', async () => {
    const user = userEvent.setup();
    const canvas = lineWithFormula();
    await user.click(canvas.formula());
    expect(canvas.field()).toHaveValue('x^2');
    expect(canvas.field()).toHaveFocus();
    await user.type(canvas.field()!, '{Shift>}{Enter}{/Shift}+1');
    expect(canvas.field()).toHaveValue('x^2\n+1');
    await user.clear(canvas.field()!);
    await user.type(canvas.field()!, 'x^3{Enter}');
    expect(canvas.popover()).toBeNull();
    expect(canvas.markdown('p')).toBe('Area $x^3$ here');
    expect(canvas.changes).toHaveLength(1);
    expect(canvas.selection()).toEqual(caretAt(6));
    expect(canvas.host('p')).toHaveFocus();
    expect(drawnCaret(canvas.host('p'))).toBe(6);
    act(() => void canvas.handle().editor.commands.undo());
    expect(canvas.markdown('p')).toBe('Area $x^2$ here');
  });

  it('is drawn with its new LaTeX by the time focus is handed back after a store, so the caret lands after it', async () => {
    const user = userEvent.setup();
    const canvas = lineWithFormula();
    const { controller } = canvas.handle();
    const handedBack: { drawn: Element | null; latex: string | null }[] = [];
    const focus = controller.focus.bind(controller);
    vi.spyOn(controller, 'focus').mockImplementation((target) => {
      const drawn = canvas.formula();
      handedBack.push({ drawn, latex: drawn?.textContent ?? null });
      focus(target);
    });
    await user.click(canvas.formula());
    await user.clear(canvas.field()!);
    await user.type(canvas.field()!, 'x^3{Enter}');
    expect(handedBack.map(({ latex }) => latex)).toEqual(['x^3']);
    expect(handedBack[0].drawn?.isConnected).toBe(true);
  });

  it('leaves Enter with the caret right after it to split the line', () => {
    const canvas = lineWithFormula();
    canvas.caret('p', 6);
    canvas.key('Enter');
    expect(canvas.popover()).toBeNull();
    expect(canvas.last().map((block) => block.type)).toEqual(['MARKDOWN', 'MARKDOWN', 'MARKDOWN']);
    expect(canvas.last()[0].data.markdown).toBe('Area $x^2$');
  });

  it('opens on Enter while a selection covers it exactly, and discards the edit on Escape', async () => {
    const user = userEvent.setup();
    const canvas = lineWithFormula();
    canvas.caret('p', 6);
    const { controller } = canvas.handle();
    const over = textSelection({ block: 'p', region: 'text', offset: 6 }, { block: 'p', region: 'text', offset: 5 });
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(over)));
    canvas.key('Enter');
    expect(canvas.field()).toHaveValue('x^2');
    await user.type(canvas.field()!, 'zz{Escape}');
    expect(canvas.popover()).toBeNull();
    expect(canvas.changes).toHaveLength(0);
    expect(canvas.selection()).toEqual(caretAt(6));
    expect(canvas.host('p')).toHaveFocus();
  });

  it('extends the selection on a Shift+click rather than opening', () => {
    const canvas = lineWithFormula();
    canvas.caret('p', 2);
    act(() => void fireEvent.click(canvas.formula(), { shiftKey: true }));
    expect(canvas.popover()).toBeNull();
  });

  it('is selected and highlighted by a first Backspace, opens on Enter then, and goes with a second Backspace', () => {
    const canvas = lineWithFormula();
    canvas.caret('p', 6);
    canvas.key('Backspace');
    expect(canvas.selection()).toEqual(textSelection({ block: 'p', region: 'text', offset: 5 }, { block: 'p', region: 'text', offset: 6 }));
    expect(canvas.formula().closest('[data-quoin-selected-atom]')).not.toBeNull();
    canvas.key('Enter');
    expect(canvas.field()).toHaveValue('x^2');
    canvas.key('Escape', {}, canvas.field()!);
    expect(canvas.selection()).toEqual(caretAt(6));
    canvas.key('Backspace');
    canvas.key('Backspace');
    expect(canvas.markdown('p')).toBe('Area  here');
  });

  it('is selected exactly, and highlighted, by Shift+ArrowLeft right after it at the end of a line', () => {
    const canvas = mountMath([paragraph('p', 'Area $x^2$')]);
    canvas.caret('p', 6);
    canvas.key('ArrowLeft', { shiftKey: true });
    expect(canvas.selection()).toEqual(textSelection({ block: 'p', region: 'text', offset: 6 }, { block: 'p', region: 'text', offset: 5 }));
    expect(canvas.host('p').querySelector('[data-quoin-selected-atom]')).not.toBeNull();
    expect(drawnCaret(canvas.host('p'))).toBe(5);
  });

  it('keeps the selection the browser drew over it at the end of a line once the highlight redraws it', () => {
    const canvas = mountMath([paragraph('p', 'Area $x^2$')]);
    const host = canvas.host('p');
    canvas.caret('p', 6);
    act(() => {
      document.getSelection()!.setBaseAndExtent(host, 2, host, 1);
      canvas.handle().controller.readSelectionFromDom();
    });
    expect(host.querySelector('[data-quoin-selected-atom]')).not.toBeNull();
    const { anchorNode, anchorOffset } = document.getSelection()!;
    expect([domMapOf(host)?.fromDom(anchorNode!, anchorOffset), drawnCaret(host)]).toEqual([6, 5]);
  });

  it('is removed, as one undo step, when its LaTeX is cleared', async () => {
    const user = userEvent.setup();
    const canvas = lineWithFormula();
    await user.click(canvas.formula());
    await user.clear(canvas.field()!);
    await user.keyboard('{Enter}');
    expect(canvas.markdown('p')).toBe('Area  here');
    expect(canvas.selection()).toEqual(caretAt(5));
    act(() => void canvas.handle().editor.commands.undo());
    expect(canvas.markdown('p')).toBe('Area $x^2$ here');
  });

  it('opens nothing on a read-only canvas', () => {
    const canvas = lineWithFormula({ renderMath: fakeRenderMath }, { readOnly: true });
    fireEvent.click(canvas.formula());
    expect(canvas.popover()).toBeNull();
    expect(canvas.formula().querySelector('.fake-math')).toHaveTextContent('x^2');
  });

  it('has no accessibility violations, editable or read-only, with or without renderMath', async () => {
    expect(await axe(lineWithFormula().container)).toHaveNoViolations();
    expect(await axe(lineWithFormula({ renderMath: fakeRenderMath }, { readOnly: true }).container)).toHaveNoViolations();
  });
});
