import { describe, expect, it } from 'vitest';
import { buildState } from '../../engine/test-support/build-state';
import { linkAtSelection } from './link-at-selection';

const DOC = ['Read [the docs](https://quoin.dev "Quoin") or [home](https://example.com)'];

const caret = (offset: number) => buildState(DOC, { block: 0, offset });
const range = (anchor: number, head: number) =>
  buildState(DOC, { anchor: { block: 0, offset: anchor }, head: { block: 0, offset: head } });

const theDocs = { href: 'https://quoin.dev', title: 'Quoin', range: { block: 'b0', region: 'text', from: 5, to: 13 } };
const home = { href: 'https://example.com', range: { block: 'b0', region: 'text', from: 17, to: 21 } };

describe('linkAtSelection', () => {
  it('finds the whole link around a caret inside it, with its title', () => {
    expect(linkAtSelection(caret(8))).toEqual(theDocs);
    expect(linkAtSelection(caret(5))).toEqual(theDocs);
  });

  it('finds the link a caret at its end edge has just left, as the link commands do', () => {
    expect(linkAtSelection(caret(13))).toEqual(theDocs);
    expect(linkAtSelection(caret(21))).toEqual(home);
  });

  it('finds nothing at a caret outside every link', () => {
    expect(linkAtSelection(caret(2))).toBeNull();
    expect(linkAtSelection(caret(15))).toBeNull();
  });

  it('finds the link a range lies inside, whichever way it was made', () => {
    expect(linkAtSelection(range(6, 10))).toEqual(theDocs);
    expect(linkAtSelection(range(13, 5))).toEqual(theDocs);
  });

  it('finds nothing for a range that runs out of its link', () => {
    expect(linkAtSelection(range(3, 8))).toBeNull();
    expect(linkAtSelection(range(10, 15))).toBeNull();
    expect(linkAtSelection(range(13, 18))).toBeNull();
  });

  it('finds nothing without a text selection', () => {
    expect(linkAtSelection(buildState(DOC, { blocks: [0, 0] }))).toBeNull();
    expect(linkAtSelection(buildState(DOC, null))).toBeNull();
  });
});
