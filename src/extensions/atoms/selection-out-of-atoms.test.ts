import { moveSelectionOutOfAtoms } from './selection-out-of-atoms';

const MATH = ['math'];

function line() {
  const host = document.createElement('div');
  host.innerHTML =
    'Area <span data-quoin-atom="math" contenteditable="false">x^2</span> here ' +
    '<span data-quoin-atom="mention" contenteditable="false">@Ada</span>';
  document.body.replaceChildren(host);
  const [before, formula, after, mention] = Array.from(host.childNodes) as [Text, HTMLElement, Text, HTMLElement];
  return { host, before, formula, latex: formula.firstChild as Text, after, mention };
}

function select(anchor: Node, anchorOffset: number, focus: Node, focusOffset: number) {
  const selection = document.getSelection()!;
  selection.setBaseAndExtent(anchor, anchorOffset, focus, focusOffset);
  return selection;
}

const points = (selection: Selection) => [
  selection.anchorNode,
  selection.anchorOffset,
  selection.focusNode,
  selection.focusOffset,
];

describe('moveSelectionOutOfAtoms', () => {
  it('takes the end of a range that stops inside an atom past it, so the range holds the atom whole', () => {
    const { host, before, formula } = line();
    const forward = select(before, 4, formula, 0);
    expect(moveSelectionOutOfAtoms(forward, host, MATH)).toBe(true);
    expect(points(forward)).toEqual([before, 4, host, 2]);
  });

  it('takes the end of a range drawn back into an atom to its start', () => {
    const { host, after, formula } = line();
    const backward = select(after, 0, formula, 1);
    expect(moveSelectionOutOfAtoms(backward, host, MATH)).toBe(true);
    expect(points(backward)).toEqual([after, 0, host, 1]);
  });

  it('takes an anchor inside an atom to the side away from the focus', () => {
    const { host, after, latex } = line();
    const fromInside = select(latex, 1, after, 3);
    expect(moveSelectionOutOfAtoms(fromInside, host, MATH)).toBe(true);
    expect(points(fromInside)).toEqual([host, 1, after, 3]);
  });

  it('takes a range inside one atom to the atom whole', () => {
    const { host, latex } = line();
    const within = select(latex, 0, latex, 2);
    expect(moveSelectionOutOfAtoms(within, host, MATH)).toBe(true);
    expect(points(within)).toEqual([host, 1, host, 2]);
  });

  it('takes a caret inside an atom to its nearer side, as the editor reads it', () => {
    const { host, latex } = line();
    const early = select(latex, 1, latex, 1);
    expect(moveSelectionOutOfAtoms(early, host, MATH)).toBe(true);
    expect(points(early)).toEqual([host, 1, host, 1]);
    const late = select(latex, 2, latex, 2);
    expect(moveSelectionOutOfAtoms(late, host, MATH)).toBe(true);
    expect(points(late)).toEqual([host, 2, host, 2]);
  });

  it('leaves a selection in the text, inside an atom of another type, or outside the root as it is', () => {
    const { host, before, after, mention } = line();
    const inText = select(before, 1, after, 2);
    expect(moveSelectionOutOfAtoms(inText, host, MATH)).toBe(false);
    expect(points(inText)).toEqual([before, 1, after, 2]);

    const other = select(after, 0, mention.firstChild!, 2);
    expect(moveSelectionOutOfAtoms(other, host, MATH)).toBe(false);

    const elsewhere = document.createElement('div');
    elsewhere.innerHTML = '<span data-quoin-atom="math">y</span>';
    document.body.append(elsewhere);
    const outside = select(elsewhere.firstChild!.firstChild!, 0, elsewhere.firstChild!.firstChild!, 0);
    expect(moveSelectionOutOfAtoms(outside, host, MATH)).toBe(false);
  });
});
