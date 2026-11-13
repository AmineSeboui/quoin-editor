import { paragraph } from '../../blocks/test-support/test-canvas';
import { mountMath } from '../math/math-test-canvas';

const TEXT = 'Area $x^2$ here';
const BEFORE_ATOM = 'Area '.length;

afterEach(() => document.documentElement.removeAttribute('dir'));

function selectionOf(canvas: ReturnType<typeof mountMath>) {
  const selection = canvas.handle().editor.state.selection;
  if (selection?.kind !== 'text') throw new Error('the selection is not in text');
  return { anchor: selection.anchor.offset, head: selection.head.offset };
}

/**
 * The keymap binds `Shift-ArrowLeft` and `Shift-ArrowRight`, which name sides of the screen. On a right to left page
 * the left arrow is the one that reaches forward over the atom, so the view hands the keymap the other one.
 */
describe('Shift with an arrow over an atom on a right to left page', () => {
  it('takes the atom whole with the left arrow, which is the way the text runs on', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    const canvas = mountMath([paragraph('p', TEXT)]);
    canvas.caret('p', BEFORE_ATOM);
    canvas.key('ArrowLeft', { shiftKey: true });
    expect(selectionOf(canvas)).toEqual({ anchor: BEFORE_ATOM, head: BEFORE_ATOM + 1 });
  });

  it('still takes it whole with the right arrow on an ordinary page', () => {
    const canvas = mountMath([paragraph('p', TEXT)]);
    canvas.caret('p', BEFORE_ATOM);
    canvas.key('ArrowRight', { shiftKey: true });
    expect(selectionOf(canvas)).toEqual({ anchor: BEFORE_ATOM, head: BEFORE_ATOM + 1 });
  });
});
