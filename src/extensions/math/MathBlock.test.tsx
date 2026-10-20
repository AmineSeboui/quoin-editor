import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/void/test-canvas';
import { resetDevWarnings } from '../../dev-warn';
import { nodeSelection } from '../../engine';
import { fakeRenderMath, mathBlock, mountMath } from './math-test-canvas';

const around = (latex: string) => [paragraph('p', 'Above'), mathBlock(latex), paragraph('q', 'Below')];
const equation = () => screen.getByRole('group', { name: 'Equation' });
const latexOf = (canvas: ReturnType<typeof mountMath>) => canvas.last()?.find((block) => block.id === 'm')?.data.latex;

describe('a math block', () => {
  it('draws the HTML of the host renderMath as it is, in display mode', () => {
    const renderMath = vi.fn(fakeRenderMath);
    mountMath(around('x^2'), { renderMath });
    expect(renderMath).toHaveBeenCalledWith('x^2', { displayMode: true });
    const drawn = equation().querySelector('.fake-math');
    expect(drawn).toHaveAttribute('data-display', 'true');
    expect(drawn).toHaveTextContent('x^2');
    expect(drawn!.closest('[aria-label], [role="img"]')).toBe(equation());
  });

  it('without renderMath the source shows as monospace text', () => {
    mountMath(around('\\frac{a}{b} < c'));
    const source = equation().querySelector('pre.quoin-math-source');
    expect(source).toHaveTextContent('\\frac{a}{b} < c');
    expect(source?.querySelector('*')).toBeNull();
  });

  it('is called by its label when selected as a whole with no LaTeX, and in the title of its block menu', () => {
    const { nodeSelect, sink, openBlockMenu } = mountMath(around(''), { labels: { equation: 'Formula' } });
    nodeSelect('m');
    expect(sink()).toHaveAccessibleName('Formula');
    expect(openBlockMenu()).toHaveAccessibleName('Formula block menu');
  });

  it('shows that an equation with no LaTeX is empty', () => {
    mountMath(around(''), { renderMath: fakeRenderMath, labels: { emptyEquation: '\u00c9quation vide' } });
    expect(equation()).toHaveTextContent('\u00c9quation vide');
  });

  it('shows the source when renderMath throws or returns no string, and keeps the canvas', () => {
    resetDevWarnings();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const throwing = () => {
      throw new Error('KaTeX parse error');
    };
    const { shell } = mountMath(around('\\frac{'), { renderMath: throwing });
    expect(equation().querySelector('pre.quoin-math-source')).toHaveTextContent('\\frac{');
    expect(shell('q')).toHaveTextContent('Below');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it.each([
    ['something other than a string', () => undefined as unknown as string],
    ['a blank string', () => ' \n'],
  ])('shows the source, in the block and in a line, when renderMath returns %s', (_, renderMath) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { shell } = mountMath([paragraph('p', 'Area $x$'), mathBlock('a+b')], { renderMath });
    expect(equation().querySelector('pre.quoin-math-source')).toHaveTextContent('a+b');
    expect(shell('p').querySelector('[data-quoin-atom="math"]')).toHaveTextContent('x');
    vi.restoreAllMocks();
  });

  it('opens the editor on a click, with the LaTeX in a focused field and a live preview', async () => {
    const user = userEvent.setup();
    const canvas = mountMath(around('x^2'), { renderMath: fakeRenderMath });
    await user.click(equation());
    expect(canvas.selection()).toEqual(nodeSelection('m'));
    expect(canvas.field()).toHaveValue('x^2');
    expect(canvas.field()).toHaveFocus();
    await user.type(canvas.field()!, '+y');
    const preview = within(canvas.popover()!).getByRole('group', { name: 'Preview' });
    expect(preview.querySelector('.fake-math')).toHaveTextContent('x^2+y');
    expect(preview.querySelector('.fake-math')).toHaveAttribute('data-display', 'true');
  });

  it('opens the editor on Enter while it is selected as a whole, the caret at the end of the LaTeX', () => {
    const canvas = mountMath(around('x^2'));
    canvas.nodeSelect('m');
    canvas.press('Enter');
    expect(canvas.field()).toHaveValue('x^2');
    expect(canvas.field()).toHaveFocus();
    expect([canvas.field()!.selectionStart, canvas.field()!.selectionEnd]).toEqual([3, 3]);
    expect(canvas.last()).toBeUndefined();
  });

  it('opens the editor of the block that $$ and a space turn a paragraph into', () => {
    const canvas = mountMath([paragraph('p', '')]);
    canvas.caret('p', 0);
    canvas.type('$$ ');
    expect(canvas.last()?.[0]).toMatchObject({ type: 'MATH', data: { latex: '' } });
    expect(canvas.field()).toHaveValue('');
    expect(canvas.field()).toHaveFocus();
  });

  it('popover edits latex, storing it on Mod+Enter as one undo step, Enter breaking the line', async () => {
    const user = userEvent.setup();
    const canvas = mountMath(around('a'));
    await user.click(equation());
    await user.type(canvas.field()!, '{Enter}b');
    expect(canvas.field()).toHaveValue('a\nb');
    expect(canvas.changes).toHaveLength(0);
    canvas.key('Enter', canvas.mod(), canvas.field()!);
    expect(latexOf(canvas)).toBe('a\nb');
    expect(canvas.changes).toHaveLength(1);
    expect(canvas.popover()).toBeNull();
    expect(canvas.selection()).toEqual(nodeSelection('m'));
    expect(canvas.sink()).toHaveFocus();
    act(() => void canvas.handle().editor.commands.undo());
    expect(latexOf(canvas)).toBe('a');
  });

  it('stores the LaTeX with Save, and keeps an empty block when the LaTeX is cleared', async () => {
    const user = userEvent.setup();
    const canvas = mountMath(around('a'));
    await user.click(equation());
    await user.clear(canvas.field()!);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(canvas.last()?.map((block) => block.type)).toEqual(['MARKDOWN', 'MATH', 'MARKDOWN']);
    expect(latexOf(canvas)).toBe('');
    expect(equation()).toHaveTextContent('Empty equation');
    expect(canvas.sink()).toHaveFocus();
  });

  it('discards the edit on Escape, handing focus back to the block', async () => {
    const user = userEvent.setup();
    const canvas = mountMath(around('a'));
    await user.click(equation());
    await user.type(canvas.field()!, 'bc{Escape}');
    expect(canvas.popover()).toBeNull();
    expect(canvas.changes).toHaveLength(0);
    expect(canvas.selection()).toEqual(nodeSelection('m'));
    expect(canvas.sink()).toHaveFocus();
  });

  it('is never replaced by a key typed while it is selected as a whole', () => {
    const canvas = mountMath(around('a'));
    canvas.nodeSelect('m');
    canvas.press('x');
    expect(canvas.changes).toHaveLength(0);
    expect(canvas.popover()).toBeNull();
  });

  it('opens nothing on a read-only canvas, and draws the equation', () => {
    const canvas = mountMath(around('x^2'), { renderMath: fakeRenderMath }, { readOnly: true });
    fireEvent.click(equation());
    expect(equation().querySelector('.fake-math')).toHaveTextContent('x^2');
    expect(canvas.popover()).toBeNull();
  });

  it('has no accessibility violations, drawn and in its editor', async () => {
    const user = userEvent.setup();
    const { container, field, popover } = mountMath(around('x^2'));
    expect(await axe(container)).toHaveNoViolations();
    await user.click(equation());
    expect(field()).not.toBeNull();
    await act(async () => {});
    expect(await axe(popover()!)).toHaveNoViolations();
  });

  it('has no accessibility violations rendered on a read-only canvas', async () => {
    const { container } = mountMath(around('x^2'), { renderMath: fakeRenderMath }, { readOnly: true });
    expect(await axe(container)).toHaveNoViolations();
  });
});
