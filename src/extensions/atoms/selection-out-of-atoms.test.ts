import { coreBlocks } from '../../blocks/core';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import { domMapOf } from '../../view';
import { moveSelectionOutOfAtoms } from './selection-out-of-atoms';

const MATH = ['math'];

// A line drawn by the view, its formula from offset 5 to 6: "Area " then the formula, then " here " and a mention.
function line() {
  const { shell, handle } = mountCanvas([paragraph('p', 'Area $x^2$ here [@Ada](mention:1)')], { blockTypes: coreBlocks });
  const host = shell('p').querySelector<HTMLElement>('[data-quoin-host]')!;
  const formula = host.querySelector<HTMLElement>('[data-quoin-atom="math"]')!;
  const mention = host.querySelector<HTMLElement>('[data-quoin-atom="mention"]')!;
  const texts = Array.from(host.childNodes).filter((node): node is Text => node.nodeType === Node.TEXT_NODE);
  const hostOf = (node: Node) => handle().controller.registry.locate(node)?.element ?? null;
  const move = (anchor: Node, anchorOffset: number, focus: Node, focusOffset: number) => {
    const selection = document.getSelection()!;
    selection.setBaseAndExtent(anchor, anchorOffset, focus, focusOffset);
    return moveSelectionOutOfAtoms(selection, hostOf, MATH);
  };
  // Where the view reads each end of the selection, and whether either is still inside the formula.
  const read = () => {
    const { anchorNode, anchorOffset, focusNode, focusOffset } = document.getSelection()!;
    const map = domMapOf(host)!;
    const inside = formula.contains(anchorNode) || formula.contains(focusNode);
    return { anchor: map.fromDom(anchorNode!, anchorOffset), focus: map.fromDom(focusNode!, focusOffset), inside };
  };
  return { host, formula, latex: formula.firstChild as Text, before: texts[0], after: texts[1], mention, move, read };
}

describe('moveSelectionOutOfAtoms', () => {
  it('takes the end of a range that stops inside an atom past it, so the range holds the atom whole', () => {
    const { before, formula, move, read } = line();
    expect(move(before, 4, formula, 0)).toBe(true);
    expect(read()).toEqual({ anchor: 4, focus: 6, inside: false });
  });

  it('takes the end of a range drawn back into an atom to its start', () => {
    const { after, formula, move, read } = line();
    expect(move(after, 0, formula, 1)).toBe(true);
    expect(read()).toEqual({ anchor: 6, focus: 5, inside: false });
  });

  it('takes an anchor inside an atom to the side away from the focus', () => {
    const { after, latex, move, read } = line();
    expect(move(latex, 1, after, 3)).toBe(true);
    expect(read()).toEqual({ anchor: 5, focus: 9, inside: false });
  });

  it('takes a range inside one atom to the atom whole', () => {
    const { latex, move, read } = line();
    expect(move(latex, 0, latex, 2)).toBe(true);
    expect(read()).toEqual({ anchor: 5, focus: 6, inside: false });
  });

  it('takes a caret inside an atom to the side the view reads it at', () => {
    const { latex, move, read } = line();
    expect(move(latex, 1, latex, 1)).toBe(true);
    expect(read()).toEqual({ anchor: 5, focus: 5, inside: false });
    expect(move(latex, 2, latex, 2)).toBe(true);
    expect(read()).toEqual({ anchor: 6, focus: 6, inside: false });
  });

  it('leaves a selection in the text, inside an atom of another type, or outside any line as it is', () => {
    const { before, after, mention, move, read } = line();
    expect(move(before, 1, after, 2)).toBe(false);
    expect(read()).toEqual({ anchor: 1, focus: 8, inside: false });
    expect(move(after, 0, mention.firstChild!, 2)).toBe(false);

    const elsewhere = document.createElement('div');
    elsewhere.innerHTML = '<span data-quoin-atom="math">y</span>';
    document.body.append(elsewhere);
    const loose = elsewhere.firstChild!.firstChild!;
    expect(move(loose, 0, loose, 0)).toBe(false);
  });
});
