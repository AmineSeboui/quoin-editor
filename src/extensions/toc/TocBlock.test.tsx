import { act, cleanup, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/void/test-canvas';
import { defaultBlockLink } from '../../canvas/block-link';
import { nodeSelection, textSelection } from '../../engine';
import { heading, mountToc, tocBlock } from './toc-test-canvas';

const outline = () => [
  tocBlock(),
  heading('a', 1, 'Intro'),
  heading('b', 2, 'Setup'),
  heading('c', 3, 'Deep'),
  heading('d', 2, 'Usage'),
  paragraph('p', 'Some text'),
  heading('e', 1, 'End'),
];

const itemsOf = (list: Element): string[] =>
  Array.from(list.children, (item) => item.querySelector(':scope > a')?.textContent ?? '');

function reduceMotion(reduce: boolean) {
  const matchMedia = vi.fn((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal('matchMedia', matchMedia);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('a table of contents', () => {
  it('lists the headings as links nested by level, in a navigation named by its label', () => {
    const { nav } = mountToc(outline());
    const top = nav().querySelector(':scope > ul')!;
    expect(itemsOf(top)).toEqual(['Intro', 'End']);
    const underIntro = top.children[0].querySelector(':scope > ul')!;
    expect(itemsOf(underIntro)).toEqual(['Setup', 'Usage']);
    expect(itemsOf(underIntro.children[0].querySelector(':scope > ul')!)).toEqual(['Deep']);
    expect(top.children[1].querySelector('ul')).toBeNull();
  });

  it('nests a skipped level one deep', () => {
    const { nav } = mountToc([tocBlock(), heading('a', 1, 'Top'), heading('b', 4, 'Deep'), heading('c', 2, 'Middle')]);
    const top = nav().querySelector(':scope > ul')!;
    expect(itemsOf(top)).toEqual(['Top']);
    expect(itemsOf(top.children[0].querySelector(':scope > ul')!)).toEqual(['Deep', 'Middle']);
  });

  it('links each entry to its heading with the fragment a copied link to the block ends with', () => {
    const { entry } = mountToc([tocBlock(), heading('a b', 1, 'Spaced'), heading('c', 2, 'Plain')]);
    expect(entry('Spaced')).toHaveAttribute('href', '#block-a%20b');
    expect(entry('Plain')).toHaveAttribute('href', '#block-c');
    expect(defaultBlockLink('a b').endsWith(entry('Spaced').getAttribute('href')!)).toBe(true);
  });

  it('draws the text of a heading as text, and leaves out a heading with none', () => {
    const { nav } = mountToc([tocBlock(), heading('a', 1, 'a < b & <i>c</i>'), paragraph('e', '#')]);
    expect(within(nav()).getAllByRole('link')).toHaveLength(1);
    expect(nav().querySelector('i')).toBeNull();
  });

  it('says how to fill it, as text in the navigation, while the document has no headings', () => {
    const { nav } = mountToc([tocBlock(), paragraph('p', 'Text')]);
    expect(nav()).toHaveTextContent('Add headings to build the table of contents');
    expect(nav().querySelector('ul, ol, a')).toBeNull();
  });

  it('takes its name and its message from the labels', () => {
    mountToc([tocBlock()], { labels: { tableOfContents: 'Sommaire', noHeadings: 'Aucun titre' } });
    expect(screen.getByRole('navigation', { name: 'Sommaire' })).toHaveTextContent('Aucun titre');
  });

  it('follows the headings as they are typed, renamed and removed', () => {
    const { caret, type, nav, entry, handle } = mountToc([tocBlock(), heading('a', 1, 'Intro'), paragraph('p', '')]);
    caret('a', 'Intro'.length);
    type('!');
    expect(entry('Intro!')).toBeInTheDocument();
    caret('p', 0);
    type('## Next');
    expect(itemsOf(nav().querySelector(':scope > ul > li > ul')!)).toEqual(['Next']);
    act(() => void handle().editor.setBlocks([tocBlock()]));
    expect(nav()).toHaveTextContent('Add headings to build the table of contents');
  });

  it('has no accessibility violations, filled, empty or read-only', async () => {
    const filled = mountToc(outline());
    expect(await axe(filled.container)).toHaveNoViolations();
    cleanup();
    const empty = mountToc([tocBlock(), paragraph('p', 'Text')]);
    expect(await axe(empty.container)).toHaveNoViolations();
    cleanup();
    const readOnly = mountToc(outline(), {}, { readOnly: true });
    expect(await axe(readOnly.container)).toHaveNoViolations();
  });
});

describe('an entry of a table of contents', () => {
  it('puts the caret at the end of its heading and scrolls to it smoothly, in place of the link', () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { click, entry, selection, host, shell, changes } = mountToc(outline());
    expect(click(entry('Setup'))).toBe(false);
    expect(selection()).toEqual(textSelection({ block: 'b', region: 'text', offset: 'Setup'.length }));
    expect(host('b')).toHaveFocus();
    expect(scrolled.mock.contexts).toEqual([shell('b')]);
    expect(scrolled).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(changes).toEqual([]);
  });

  it('scrolls at once for a reader who asks for less motion', () => {
    reduceMotion(true);
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { click, entry, shell } = mountToc(outline());
    click(entry('End'));
    expect(scrolled.mock.contexts).toEqual([shell('e')]);
    expect(scrolled).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('scrolls smoothly for a reader who asks for no less motion', () => {
    reduceMotion(false);
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { click, entry } = mountToc(outline());
    click(entry('End'));
    expect(scrolled).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Meta', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
    ['the middle button', { button: 1 }],
  ])('is left to the browser on a click with %s', (_, init) => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { click, entry, selection } = mountToc(outline());
    expect(click(entry('Deep'), init)).toBe(true);
    expect(selection()).not.toEqual(textSelection({ block: 'c', region: 'text', offset: 4 }));
    expect(scrolled).not.toHaveBeenCalled();
  });

  it('is kept out of the tab order of an editable canvas, and in it on a read-only one', () => {
    const editable = mountToc(outline());
    for (const link of within(editable.nav()).getAllByRole('link')) expect(link).toHaveAttribute('tabindex', '-1');
    cleanup();
    const readOnly = mountToc(outline(), {}, { readOnly: true });
    for (const link of within(readOnly.nav()).getAllByRole('link')) expect(link).not.toHaveAttribute('tabindex');
  });

  it('on a read-only canvas, moves focus to its heading and scrolls to it without changing the document', () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { click, entry, host, shell, changes, handle } = mountToc(outline(), {}, { readOnly: true });
    const before = handle().editor.state.doc;
    expect(click(entry('Usage'))).toBe(false);
    expect(host('d')).toHaveFocus();
    expect(scrolled.mock.contexts).toEqual([shell('d')]);
    expect(handle().editor.state.doc).toBe(before);
    expect(changes).toEqual([]);
  });
});

describe('a table of contents on an editable canvas', () => {
  it('is selected as a whole by the arrows, and by a press beside its entries', () => {
    const { caret, key, selection, click, nav, sink } = mountToc([paragraph('p', ''), ...outline()]);
    caret('p', 0);
    key('ArrowDown');
    expect(selection()).toEqual(nodeSelection('toc'));
    caret('p', 0);
    click(nav());
    expect(selection()).toEqual(nodeSelection('toc'));
    expect(sink()).toHaveFocus();
  });

  it('moves focus to its first entry on Enter while selected as a whole, keeping the document', () => {
    const { nodeSelect, key, entry, changes } = mountToc(outline());
    nodeSelect('toc');
    key('Enter');
    expect(entry('Intro')).toHaveFocus();
    expect(changes).toEqual([]);
  });

  it('is never replaced by a key typed while it is selected as a whole', () => {
    const { nodeSelect, key, changes, selection } = mountToc(outline());
    nodeSelect('toc');
    key('x');
    expect(changes).toEqual([]);
    expect(selection()).toEqual(nodeSelection('toc'));
  });

  it('walks its entries with Tab and Shift+Tab, and goes back to the block past either end', () => {
    const { nodeSelect, key, entry, selection, sink } = mountToc(outline());
    nodeSelect('toc');
    key('Enter');
    key('Tab');
    expect(entry('Setup')).toHaveFocus();
    key('Tab', { shiftKey: true });
    expect(entry('Intro')).toHaveFocus();
    key('Tab', { shiftKey: true });
    expect(selection()).toEqual(nodeSelection('toc'));
    expect(sink()).toHaveFocus();
    act(() => entry('End').focus());
    key('Tab');
    expect(sink()).toHaveFocus();
  });

  it('goes back to the block on Escape from an entry', () => {
    const { nodeSelect, key, entry, selection, sink } = mountToc(outline());
    nodeSelect('toc');
    key('Enter');
    key('Tab');
    key('Escape');
    expect(selection()).toEqual(nodeSelection('toc'));
    expect(sink()).toHaveFocus();
    expect(entry('Setup')).not.toHaveFocus();
  });

  it('leaves Tab and Escape to an input method that is composing', () => {
    const { nodeSelect, key, entry } = mountToc(outline());
    nodeSelect('toc');
    key('Enter');
    key('Tab', { isComposing: true });
    expect(entry('Intro')).toHaveFocus();
    key('Escape', { isComposing: true });
    expect(entry('Intro')).toHaveFocus();
  });
});

describe('a table of contents on a read-only canvas', () => {
  it('leaves Tab to the browser, and a press beside its entries selects nothing', () => {
    const { entry, key, click, nav, selection } = mountToc(outline(), {}, { readOnly: true });
    act(() => entry('Intro').focus());
    key('Tab');
    expect(entry('Intro')).toHaveFocus();
    const before = selection();
    click(nav());
    expect(selection()).toEqual(before);
  });
});
