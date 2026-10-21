import { act } from '@testing-library/react';
import { paragraph } from '../../blocks/void/test-canvas';
import { textSelection, type QuoinBlock } from '../../engine';
import { goToHeading } from './go-to-heading';
import { heading, mountToc, tocBlock } from './toc-test-canvas';

const closedToggle: QuoinBlock = { id: 't', type: 'TOGGLE', data: { markdown: 'Details', open: false } };
const hidden: QuoinBlock = { ...heading('h', 2, 'Hidden'), indent: 1 };

afterEach(() => vi.restoreAllMocks());

describe('going to a heading', () => {
  it('reaches a heading a closed toggle hides through the toggle, where the caret lands, scrolled to', () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { click, entry, selection, host, shell } = mountToc([tocBlock(), closedToggle, hidden, paragraph('p', '')]);
    click(entry('Hidden'));
    expect(selection()).toEqual(textSelection({ block: 't', region: 'text', offset: 'Details'.length }));
    expect(host('t')).toHaveFocus();
    expect(scrolled.mock.contexts).toEqual([shell('t')]);
  });

  it('does nothing for a block that is gone, or that is no heading with text', () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { caret, handle, selection } = mountToc([tocBlock(), heading('a', 1, 'Intro')]);
    caret('a', 1);
    act(() => goToHeading(handle().controller, 'gone'));
    act(() => goToHeading(handle().controller, 'toc'));
    expect(selection()).toEqual(textSelection({ block: 'a', region: 'text', offset: 1 }));
    expect(scrolled).not.toHaveBeenCalled();
  });
});
