import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { paragraph } from '../../blocks/void/test-canvas';
import { atom, coreExtensions, text, textSelection } from '../../engine';
import { caret, md, startEditor } from '../../engine/test-support/editor-fixtures';
import { englishMathLabels } from './math-labels';
import { mathSlashItems } from './math-slash-items';
import { mountMath } from './math-test-canvas';

const commands = () => screen.queryByRole('listbox', { name: 'Commands' });
const caretAt = (offset: number) => textSelection({ block: 'p', region: 'text', offset });

function slash(command: string, markdown = 'Area') {
  const canvas = mountMath([paragraph('p', markdown), paragraph('q', 'Below')]);
  canvas.caret('p', markdown.length);
  canvas.type(` /${command}`);
  return canvas;
}

const content = (canvas: ReturnType<typeof slash>) => canvas.handle().editor.state.doc.blocks[0].regions.text;

describe('the Block equation command', () => {
  it('inserts a math block whose editor opens at once, its LaTeX stored on Mod+Enter', async () => {
    const user = userEvent.setup();
    const canvas = slash('blockeq');
    expect(within(commands()!).getByRole('option', { selected: true })).toHaveTextContent('Block equation');
    canvas.key('Enter');
    expect(canvas.last().map((block) => block.type)).toEqual(['MARKDOWN', 'MATH', 'MARKDOWN']);
    expect(canvas.field()).toHaveFocus();
    await user.type(canvas.field()!, 'x^2');
    canvas.key('Enter', canvas.mod(), canvas.field()!);
    expect(canvas.last()[1].data).toEqual({ latex: 'x^2' });
  });
});

describe('the Inline equation command', () => {
  it('opens the editor at the caret, and inserts the formula there in one step once a LaTeX is stored', async () => {
    const user = userEvent.setup();
    const canvas = slash('inlineeq');
    canvas.key('Enter');
    expect(canvas.field()).toHaveFocus();
    expect(content(canvas)).toEqual([text('Area ')]);
    await user.type(canvas.field()!, 'x^2{Enter}');
    expect(content(canvas)).toEqual([text('Area '), atom('math', { latex: 'x^2' })]);
    expect(canvas.selection()).toEqual(caretAt(6));
    expect(canvas.host('p')).toHaveFocus();
    act(() => void canvas.handle().editor.commands.undo());
    expect(content(canvas)).toEqual([text('Area ')]);
  });

  it.each([
    ['Escape', (canvas: ReturnType<typeof slash>) => canvas.key('Escape', {}, canvas.field()!)],
    ['Tab', (canvas: ReturnType<typeof slash>) => canvas.key('Tab', { shiftKey: true }, canvas.field()!)],
    [
      'a press outside',
      (canvas: ReturnType<typeof slash>) => {
        const press = Object.assign(new Event('pointerdown', { bubbles: true }), { pointerType: 'mouse', button: 0 });
        act(() => void canvas.host('q').dispatchEvent(press));
      },
    ],
  ])('leaves the text as it was on %s with nothing typed', (_, leave) => {
    const canvas = slash('inlineeq');
    canvas.key('Enter');
    const before = canvas.changes.length;
    leave(canvas);
    expect(canvas.field()).toBeNull();
    expect(content(canvas)).toEqual([text('Area ')]);
    expect(canvas.changes).toHaveLength(before);
  });

  it('hands the caret back where it was on Escape', () => {
    const canvas = slash('inlineeq');
    canvas.key('Enter');
    canvas.key('Escape', {}, canvas.field()!);
    expect(canvas.selection()).toEqual(caretAt(5));
    expect(canvas.host('p')).toHaveFocus();
  });

  it('closes, writing nothing, once its line changes under it', async () => {
    const user = userEvent.setup();
    const canvas = slash('inlineeq');
    canvas.key('Enter');
    await user.type(canvas.field()!, 'x');
    act(() => void canvas.handle().editor.setBlocks([paragraph('p', 'Changed'), paragraph('q', 'Below')]));
    expect(canvas.field()).toBeNull();
    expect(content(canvas)).toEqual([text('Changed')]);
  });

  it('is offered outside code only', () => {
    const inline = mathSlashItems(englishMathLabels).find((item) => item.id === 'inline-equation')!;
    const { editor } = startEditor([md('p', 'a `code` b')], { extensions: [...coreExtensions()] });
    editor.commands.setSelection(caret('p', 4));
    expect(inline.available?.(editor.state)).toBe(false);
    editor.commands.setSelection(caret('p', 1));
    expect(inline.available?.(editor.state)).toBe(true);
  });
});
