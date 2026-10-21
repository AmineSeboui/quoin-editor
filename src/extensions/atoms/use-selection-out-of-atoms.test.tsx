import { fireEvent } from '@testing-library/react';
import { paragraph } from '../../blocks/void/test-canvas';
import { domMapOf } from '../../view';
import { mountMath } from '../math/math-test-canvas';

function caretInFormula(canvas: ReturnType<typeof mountMath>, offset: number) {
  const host = canvas.host('p');
  const formula = host.querySelector<HTMLElement>('[data-quoin-atom="math"]')!;
  document.getSelection()!.collapse(formula.firstChild!, offset);
  const read = () => {
    const { focusNode, focusOffset } = document.getSelection()!;
    return { inside: formula.contains(focusNode), at: domMapOf(host)!.fromDom(focusNode!, focusOffset) };
  };
  return { host, read };
}

describe('the selection kept out of atoms', () => {
  it('takes a caret out of a formula on the next key, before the selectionchange of the click arrives', () => {
    const canvas = mountMath([paragraph('p', 'Area $x^2$ here')]);
    canvas.caret('p', 6);
    const { host, read } = caretInFormula(canvas, 2);
    fireEvent.keyDown(host, { key: 'Z' });
    expect(read()).toEqual({ inside: false, at: 6 });
  });

  it('leaves the selection where it is on a read-only canvas', () => {
    const canvas = mountMath([paragraph('p', 'Area $x^2$ here')], {}, { readOnly: true });
    const { host, read } = caretInFormula(canvas, 2);
    fireEvent.keyDown(host, { key: 'Z' });
    expect(read().inside).toBe(true);
  });
});
