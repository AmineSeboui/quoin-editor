import { describe, expect, it } from 'vitest';
import { atom, text } from '../model/inline';
import { applyTransaction } from '../state/editor-state';
import { historyPlugin, undo } from '../state/history';
import { Transaction } from '../state/transaction';
import { buildState, caretOf, markdownOf, run } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { clearFormatting, insertAtom, insertMention, setLink, setMark, toggleMark, unsetLink, unsetMark } from './marks';
import { isActive } from './is-active';
import { insertText } from './insert-text';

describe('mark commands', () => {
  it('toggles a mark over a range, across blocks', () => {
    const state = buildState(['hello', 'world'], { anchor: { block: 0, offset: 3 }, head: { block: 1, offset: 2 } });
    const bold = run(state, toggleMark('bold')).state;
    expect(markdownOf(bold)).toEqual(['hel**lo**', '**wo**rld']);
    expect(isActive(bold, 'bold')).toBe(true);
    expect(markdownOf(run(bold, toggleMark('bold')).state)).toEqual(['hello', 'world']);
  });

  it('toggles stored marks at a collapsed caret', () => {
    const state = run(buildState(['ab'], { block: 0, offset: 2 }), toggleMark('italic')).state;
    expect(state.storedMarks).toEqual([{ type: 'italic' }]);
    expect(isActive(state, 'italic')).toBe(true);
  });

  it('adds a coloured highlight and reads it as active with its attrs', () => {
    const state = buildState(['abc'], { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 3 } });
    const next = run(state, toggleMark('highlight', { color: 'yellow' })).state;
    expect(markdownOf(next)).toEqual(['<mark data-color="yellow">abc</mark>']);
    expect(isActive(next, 'highlight', { color: 'yellow' })).toBe(true);
    expect(isActive(next, 'highlight', { color: 'red' })).toBe(false);
  });

  it('sets, edits and removes links', () => {
    const state = buildState(['go here'], { anchor: { block: 0, offset: 3 }, head: { block: 0, offset: 7 } });
    const linked = run(state, setLink('https://a.b')).state;
    expect(markdownOf(linked)).toEqual(['go [here](https://a.b)']);
    expect(run(state, setLink('javascript:x')).ok).toBe(false);
    const caretInside = buildState(['go [here](https://a.b)'], { block: 0, offset: 5 });
    expect(markdownOf(run(caretInside, setLink('https://c.d')).state)).toEqual(['go [here](https://c.d)']);
    expect(markdownOf(run(caretInside, unsetLink).state)).toEqual(['go here']);
  });

  it('clears formatting but keeps links', () => {
    const state = buildState(['**[a](https://x.y)** _b_'], { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 3 } });
    expect(markdownOf(run(state, clearFormatting).state)).toEqual(['[a](https://x.y) b']);
  });
});

const select = (blocks: string[], anchor: [number, number], head: [number, number]) =>
  buildState(blocks, { anchor: { block: anchor[0], offset: anchor[1] }, head: { block: head[0], offset: head[1] } });

describe('toggleMark details', () => {
  it('adds the mark when only part of the range has it', () => {
    const state = select(['a**b**c'], [0, 0], [0, 3]);
    expect(markdownOf(run(state, toggleMark('bold')).state)).toEqual(['**abc**']);
  });

  it('counts atoms as characters of the range', () => {
    const state = select(['hi [@Ada](mention:1)'], [0, 0], [0, 4]);
    const bold = run(state, toggleMark('bold')).state;
    expect(markdownOf(bold)).toEqual(['**hi [@Ada](mention:1)**']);
    expect(isActive(bold, 'bold')).toBe(true);
  });

  it('is stable at a collapsed caret: the next toggle removes the stored mark', () => {
    const once = run(buildState(['ab'], { block: 0, offset: 2 }), toggleMark('italic')).state;
    const twice = run(once, toggleMark('italic')).state;
    expect(twice.storedMarks).toEqual([]);
    expect(isActive(twice, 'italic')).toBe(false);
  });

  it('starts from the marks around the caret', () => {
    const state = run(buildState(['**ab**'], { block: 0, offset: 2 }), toggleMark('italic')).state;
    expect(state.storedMarks).toEqual([{ type: 'bold' }, { type: 'italic' }]);
    const off = run(buildState(['**ab**'], { block: 0, offset: 2 }), toggleMark('bold')).state;
    expect(off.storedMarks).toEqual([]);
  });

  it('types with the stored marks', () => {
    const bold = run(buildState(['ab'], { block: 0, offset: 2 }), toggleMark('bold')).state;
    expect(markdownOf(run(bold, insertText('c')).state)).toEqual(['ab**c**']);
  });

  it('swaps the attributes of a mark that is already there instead of removing it', () => {
    const yellow = run(select(['abc'], [0, 0], [0, 3]), toggleMark('highlight', { color: 'yellow' })).state;
    const red = run(yellow, toggleMark('highlight', { color: 'red' })).state;
    expect(markdownOf(red)).toEqual(['<mark data-color="red">abc</mark>']);
    expect(markdownOf(run(red, toggleMark('highlight', { color: 'red' })).state)).toEqual(['abc']);
  });

  it('rejects colours outside the palette', () => {
    const state = select(['abc'], [0, 0], [0, 3]);
    expect(run(state, toggleMark('color', { color: 'chartreuse' })).ok).toBe(false);
    expect(run(state, toggleMark('color')).ok).toBe(false);
    expect(run(state, setMark('background', { color: 'nope' })).ok).toBe(false);
    expect(markdownOf(run(state, toggleMark('highlight')).state)).toEqual(['<mark>abc</mark>']);
    expect(markdownOf(run(state, toggleMark('color', { color: 'blue' })).state)).toEqual(['<span data-color="blue">abc</span>']);
  });

  it('formats the whole text of selected blocks, skipping blocks without text', () => {
    const state = buildState(['one', DIVIDER_FIXTURE, 'two'], { blocks: [0, 2] });
    expect(markdownOf(run(state, toggleMark('italic')).state)).toEqual(['_one_', '<DIVIDER>', '_two_']);
    expect(run(buildState([DIVIDER_FIXTURE], { node: 0 }), toggleMark('bold')).ok).toBe(false);
  });

  it('does nothing without a selection or over an empty range', () => {
    expect(run(buildState([], null), toggleMark('bold')).ok).toBe(false);
    expect(run(select(['ab', 'cd'], [0, 2], [1, 0]), toggleMark('bold')).ok).toBe(false);
    expect(run(select(['ab', '', 'cd'], [0, 2], [2, 0]), toggleMark('bold')).ok).toBe(false);
  });

  it('works inside a region that is not the primary one', () => {
    const state = buildState([{ id: 't', type: 'TABLE', data: { rows: [['abc', 'x']], header: false } }], {
      anchor: { block: 0, region: 'cell:0:0', offset: 0 },
      head: { block: 0, region: 'cell:0:0', offset: 2 },
    });
    const bold = run(state, toggleMark('bold')).state;
    expect(bold.doc.blocks[0].regions['cell:0:0']).toEqual([text('ab', [{ type: 'bold' }]), text('c')]);
    const cross = buildState([{ id: 't', type: 'TABLE', data: { rows: [['abc', 'x']], header: false } }], {
      anchor: { block: 0, region: 'cell:0:0', offset: 0 },
      head: { block: 0, region: 'cell:0:1', offset: 1 },
    });
    expect(run(cross, toggleMark('bold')).ok).toBe(false);
  });

  it('undoes in one step', () => {
    const state = buildState(['hello'], { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 5 } }, { plugins: [historyPlugin()] });
    const bold = run(state, toggleMark('bold')).state;
    expect(markdownOf(run(bold, undo).state)).toEqual(['hello']);
  });
});

describe('setMark and unsetMark', () => {
  it('sets a mark without toggling it off', () => {
    const state = select(['a**b**c'], [0, 0], [0, 3]);
    const once = run(state, setMark('bold')).state;
    expect(markdownOf(once)).toEqual(['**abc**']);
    const again = run(once, setMark('bold'));
    expect(again.ok).toBe(true);
    expect(again.tr?.docChanged).toBe(false);
  });

  it('removes a mark whatever its attributes, and skips ranges without it', () => {
    const state = select(['<mark data-color="red">ab</mark>', 'cd'], [0, 0], [1, 2]);
    const next = run(state, unsetMark('highlight'));
    expect(markdownOf(next.state)).toEqual(['ab', 'cd']);
    expect(next.tr?.steps).toHaveLength(1);
  });

  it('changes the stored marks at a caret', () => {
    const bold = buildState(['**ab**'], { block: 0, offset: 2 });
    expect(run(bold, unsetMark('bold')).state.storedMarks).toEqual([]);
    expect(run(buildState(['ab'], { block: 0, offset: 1 }), setMark('bold')).state.storedMarks).toEqual([{ type: 'bold' }]);
  });
});

describe('links', () => {
  it('returns false for a caret outside a link, an empty href or no selection', () => {
    const outside = buildState(['go [here](https://a.b)'], { block: 0, offset: 1 });
    expect(run(outside, setLink('https://c.d')).ok).toBe(false);
    expect(run(outside, unsetLink).ok).toBe(false);
    expect(run(select(['abc'], [0, 0], [0, 3]), setLink('  ')).ok).toBe(false);
    expect(run(buildState([], null), setLink('https://c.d')).ok).toBe(false);
  });

  it('accepts relative, anchor and mailto destinations and writes titles', () => {
    const state = select(['abc'], [0, 0], [0, 3]);
    expect(markdownOf(run(state, setLink('#top')).state)).toEqual(['[abc](#top)']);
    expect(markdownOf(run(state, setLink('/docs/a')).state)).toEqual(['[abc](/docs/a)']);
    expect(markdownOf(run(state, setLink('mailto:a@b.c')).state)).toEqual(['[abc](mailto:a@b.c)']);
    expect(markdownOf(run(state, setLink('https://a.b', 'Home')).state)).toEqual(['[abc](https://a.b "Home")']);
  });

  it('replaces the link of a selection and keeps other marks', () => {
    const state = select(['**[abc](https://a.b)**'], [0, 0], [0, 3]);
    expect(markdownOf(run(state, setLink('https://c.d')).state)).toEqual(['[**abc**](https://c.d)']);
  });

  it('unlinks only the selected part of a link, and ignores ranges without one', () => {
    const state = select(['[abcd](https://a.b)'], [0, 0], [0, 2]);
    expect(markdownOf(run(state, unsetLink).state)).toEqual(['ab[cd](https://a.b)']);
    const plain = run(select(['abc'], [0, 0], [0, 3]), unsetLink);
    expect(plain.ok).toBe(true);
    expect(plain.tr?.docChanged).toBe(false);
  });

  it('edits the link at the edge of its text', () => {
    const state = buildState(['go [here](https://a.b)'], { block: 0, offset: 7 });
    expect(markdownOf(run(state, setLink('https://c.d')).state)).toEqual(['go [here](https://c.d)']);
  });
});

describe('clearFormatting details', () => {
  it('drops every other mark, custom ones included, across blocks', () => {
    const state = select(['**a** <u>b</u>', '~~c~~ `d`'], [0, 0], [1, 3]);
    expect(markdownOf(run(state, clearFormatting).state)).toEqual(['a b', 'c d']);
  });

  it('keeps comments', () => {
    const state = buildState(['<span data-comment="c1">**a**</span>'], { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 1 } });
    const next = run(state, clearFormatting).state;
    expect(isActive(next, 'comment')).toBe(true);
    expect(isActive(next, 'bold')).toBe(false);
  });

  it('clears the stored marks at a caret but keeps a link', () => {
    const state = run(buildState(['ab'], { block: 0, offset: 2 }), toggleMark('bold')).state;
    expect(run(state, clearFormatting).state.storedMarks).toEqual([]);
    expect(run(buildState([], null), clearFormatting).ok).toBe(false);
  });
});

describe('insertAtom and insertMention', () => {
  it('inserts a mention at the end of the text and puts the caret after it', () => {
    const next = run(buildState(['hi '], { block: 0, offset: 3 }), insertMention({ id: '1', label: 'Ada' })).state;
    expect(markdownOf(next)).toEqual(['hi [@Ada](mention:1)']);
    expect(caretOf(next)).toEqual({ block: 0, offset: 4 });
  });

  it('writes the kind into the attributes when given', () => {
    const next = run(buildState(['x'], { block: 0, offset: 1 }), insertMention({ id: '7', label: 'Ops', kind: 'team' })).state;
    expect(markdownOf(next)).toEqual(['x[@Ops](mention:team:7)']);
  });

  it('replaces the selection and takes the marks from the caret', () => {
    const state = select(['**abcd**'], [0, 1], [0, 3]);
    const next = run(state, insertAtom('math', { latex: 'x' })).state;
    expect(markdownOf(next)).toEqual(['**a$x$d**']);
    expect(caretOf(next)).toEqual({ block: 0, offset: 2 });
  });

  it('uses the stored marks and does not extend a link', () => {
    const italic = run(buildState(['ab'], { block: 0, offset: 2 }), toggleMark('italic')).state;
    const typed = run(italic, insertAtom('math', { latex: 'x' })).state;
    expect(typed.doc.blocks[0].regions.text).toEqual([text('ab'), atom('math', { latex: 'x' }, [{ type: 'italic' }])]);
    const linked = buildState(['[ab](https://a.b)'], { block: 0, offset: 2 });
    const after = run(linked, insertAtom('math', { latex: 'x' })).state;
    expect(after.doc.blocks[0].regions.text[1]).toEqual(atom('math', { latex: 'x' }));
  });

  it('needs a text selection', () => {
    expect(run(buildState([DIVIDER_FIXTURE], { node: 0 }), insertMention({ id: '1', label: 'Ada' })).ok).toBe(false);
    expect(run(buildState([], null), insertMention({ id: '1', label: 'Ada' })).ok).toBe(false);
  });

  it('undoes as one step', () => {
    const state = buildState(['hi'], { block: 0, offset: 2 }, { plugins: [historyPlugin()] });
    const next = run(state, insertMention({ id: '1', label: 'Ada' })).state;
    expect(markdownOf(run(next, undo).state)).toEqual(['hi']);
  });
});

describe('transactions', () => {
  it('leaves the document alone when only the stored marks change', () => {
    const state = buildState(['ab'], { block: 0, offset: 2 });
    const { tr } = run(state, toggleMark('bold'));
    expect(tr?.docChanged).toBe(false);
    expect(tr?.storedMarksSet).toBe(true);
    expect(applyTransaction(state, new Transaction(state)).storedMarks).toBeNull();
  });
});
