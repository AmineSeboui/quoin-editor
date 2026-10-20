import { StrictMode, createRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import { coreBlocks } from '../../blocks/core';
import { paragraph } from '../../blocks/void/test-canvas';
import { textSelection, type QuoinBlock } from '../../engine';
import { mathExtension } from './math-extension';
import { mathBlock, mountMath } from './math-test-canvas';

const field = () => screen.queryByRole('textbox', { name: 'LaTeX' });
const latexOf = (blocks: QuoinBlock[] | undefined) => blocks?.find((block) => block.id === 'm')?.data.latex;

function pointer(target: Element, type: string, pointerType: string) {
  const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { pointerType, button: 0 });
  act(() => void target.dispatchEvent(event));
}

async function editing(typed: string) {
  const user = userEvent.setup();
  const canvas = mountMath([paragraph('p', 'Area $x$ here'), mathBlock('a'), paragraph('q', 'Below')]);
  await user.click(screen.getByRole('group', { name: 'Equation' }));
  await user.type(field()!, typed);
  const below = canvas.host('q');
  return { ...canvas, user, below, latex: () => latexOf(canvas.last()) };
}

describe('the math editor, when something outside it is pressed', () => {
  it('stores the LaTeX as soon as a mouse press lands, before any click, moving focus nowhere itself', async () => {
    const { latex, below, sink } = await editing('b');
    pointer(below, 'pointerdown', 'mouse');
    expect(latex()).toBe('ab');
    expect(field()).toBeNull();
    expect(sink()).not.toHaveFocus();
    expect(below).not.toHaveFocus();
  });

  it('stores the LaTeX on a mouse press into the text, keeping the focus and the caret the press gave the text', async () => {
    const { latex, below, user, handle } = await editing('b');
    await user.click(below);
    expect(latex()).toBe('ab');
    expect(field()).toBeNull();
    expect(below).toHaveFocus();
    expect(handle().editor.state.selection).toMatchObject({ kind: 'text', head: { block: 'q' } });
  });

  it('stays open with what was typed through a touch scroll that starts outside it', async () => {
    const { latex, below, user } = await editing('b');
    pointer(below, 'pointerdown', 'touch');
    pointer(below, 'pointercancel', 'touch');
    expect(field()).toHaveValue('ab');
    expect(latex()).toBeUndefined();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(latex()).toBe('ab');
  });

  it('stores the LaTeX on a tap into the text, keeping the focus and the caret the tap gave the text', async () => {
    const { latex, below, handle } = await editing('b');
    pointer(below, 'pointerdown', 'touch');
    act(() => {
      below.focus();
      document.getSelection()!.collapse(below.firstChild!, 2);
    });
    act(() => void fireEvent.click(below));
    expect(latex()).toBe('ab');
    expect(field()).toBeNull();
    expect(below).toHaveFocus();
    expect(handle().editor.state.selection).toEqual(textSelection({ block: 'q', region: 'text', offset: 2 }));
  });
});

describe('the math editor and its keys', () => {
  it('moves between its field and Save with Tab, and stores the LaTeX on Tab out of either end', async () => {
    const { user, latex, sink } = await editing('b');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(field()).toHaveFocus();
    await user.tab({ shift: true });
    expect(latex()).toBe('ab');
    expect(field()).toBeNull();
    expect(sink()).toHaveFocus();
  });

  it('stores nothing on Enter while an input method composes', async () => {
    const { changes, mod } = await editing('b');
    fireEvent.keyDown(field()!, { key: 'Enter', ...mod(), isComposing: true });
    expect(field()).toHaveValue('ab');
    expect(changes).toHaveLength(0);
  });

  it('opens nothing on Enter on a selected formula while an input method composes', () => {
    const canvas = mountMath([paragraph('p', 'Area $x$')]);
    canvas.caret('p', 6);
    canvas.key('Backspace');
    canvas.key('Enter', { isComposing: true });
    expect(field()).toBeNull();
  });
});

describe('the math editor, when what it edits changes under it', () => {
  it('closes and writes nothing once its block is gone', async () => {
    const { handle, changes } = await editing('b');
    act(() => void handle().editor.setBlocks([paragraph('p', 'Area $x$ here'), paragraph('q', 'Below')]));
    expect(field()).toBeNull();
    expect(changes.some((blocks) => latexOf(blocks) !== undefined)).toBe(false);
  });

  it('closes and writes nothing once the LaTeX of its block changes under it, typed in or not', async () => {
    const user = userEvent.setup();
    for (const typed of ['', 'b']) {
      const canvas = mountMath([mathBlock('a'), paragraph('q', 'Below')]);
      await user.click(screen.getByRole('group', { name: 'Equation' }));
      if (typed !== '') await user.type(field()!, typed);
      act(() => void canvas.handle().editor.setBlocks([mathBlock('remote'), paragraph('q', 'Below')]));
      expect(field()).toBeNull();
      pointer(canvas.host('q'), 'pointerdown', 'mouse');
      expect(canvas.handle().editor.getBlocks()[0].data.latex).toBe('remote');
      expect(canvas.changes).toEqual([]);
      cleanup();
    }
  });

  it.each(['Now $x$ here', 'Area $z$ here'])(
    'closes and writes nothing once its formula is no longer where it was, or another one is, in %j',
    async (markdown) => {
      const user = userEvent.setup();
      const canvas = mountMath([paragraph('p', 'Area $x$ here')]);
      await user.click(canvas.host('p').querySelector('[data-quoin-atom="math"]')!);
      await user.type(field()!, 'y');
      act(() => void canvas.handle().editor.setBlocks([paragraph('p', markdown)]));
      expect(field()).toBeNull();
      expect(canvas.changes).toEqual([]);
      expect(canvas.handle().editor.getBlocks()[0].data.markdown).toBe(markdown);
    },
  );

  it('closes and writes nothing once the canvas turns read-only', async () => {
    const user = userEvent.setup();
    const changes: QuoinBlock[][] = [];
    const ref = createRef<QuoinEditorHandle>();
    const extensions = [mathExtension()];
    function Host({ readOnly }: { readOnly: boolean }) {
      const [blocks, setBlocks] = useState([mathBlock('a')]);
      const onChange = (next: QuoinBlock[]) => {
        changes.push(next);
        setBlocks(next);
      };
      return <BlockCanvas ref={ref} blocks={blocks} onChange={onChange} blockTypes={coreBlocks} extensions={extensions} readOnly={readOnly} />;
    }
    const { rerender } = render(<Host readOnly={false} />);
    await user.click(screen.getByRole('group', { name: 'Equation' }));
    await user.type(field()!, 'b');
    rerender(<Host readOnly />);
    expect(field()).toBeNull();
    expect(changes).toEqual([]);
  });
});

describe('the math editor under StrictMode', () => {
  function mountStrict() {
    const changes: QuoinBlock[][] = [];
    const extensions = [mathExtension()];
    function Host() {
      const [blocks, setBlocks] = useState([paragraph('p', 'Area $x$'), mathBlock('a')]);
      const onChange = (next: QuoinBlock[]) => {
        changes.push(next);
        setBlocks(next);
      };
      return <BlockCanvas blocks={blocks} onChange={onChange} blockTypes={coreBlocks} extensions={extensions} />;
    }
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    return { latex: () => latexOf(changes.at(-1)), markdown: () => changes.at(-1)?.[0].data.markdown };
  }

  it('stays open, and stores the LaTeX of a block on Save', async () => {
    const user = userEvent.setup();
    const { latex } = mountStrict();
    await user.click(screen.getByRole('group', { name: 'Equation' }));
    await user.type(field()!, 'b');
    expect(field()).toHaveValue('ab');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(latex()).toBe('ab');
    expect(field()).toBeNull();
  });

  it('stays open, and stores the LaTeX of a formula on Enter', async () => {
    const user = userEvent.setup();
    const { markdown } = mountStrict();
    await user.click(document.querySelector('[data-quoin-atom="math"]')!);
    await user.type(field()!, 'y{Enter}');
    expect(markdown()).toBe('Area $xy$');
    expect(field()).toBeNull();
  });
});
