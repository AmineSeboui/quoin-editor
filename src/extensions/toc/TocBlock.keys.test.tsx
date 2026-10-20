import { act } from '@testing-library/react';
import { paragraph } from '../../blocks/void/test-canvas';
import { nodeSelection } from '../../engine';
import { heading, mountToc, outline } from './toc-test-canvas';

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

describe('focus in a table of contents', () => {
  it('goes back to the block when a change from elsewhere takes away the focused entry', () => {
    const { nodeSelect, key, entry, handle, selection, sink } = mountToc(outline());
    nodeSelect('toc');
    key('Enter');
    key('Tab');
    expect(entry('Setup')).toHaveFocus();
    act(() => void handle().editor.setBlocks(outline().filter((block) => block.id !== 'b' && block.id !== 'c')));
    expect(selection()).toEqual(nodeSelection('toc'));
    expect(sink()).toHaveFocus();
  });

  it('stays on the entry of a heading a change from elsewhere moves to another level', () => {
    const { nodeSelect, key, entry, handle } = mountToc(outline());
    nodeSelect('toc');
    key('Enter');
    key('Tab');
    const moved = outline().map((block) => (block.id === 'b' ? heading('b', 1, 'Setup') : block));
    act(() => void handle().editor.setBlocks(moved));
    expect(entry('Setup').closest('ul')?.parentElement?.tagName).toBe('NAV');
    expect(entry('Setup')).toHaveFocus();
  });

  it('is not taken back once a press elsewhere has moved it to the page', () => {
    const { nodeSelect, key, entry, handle, sink } = mountToc(outline());
    nodeSelect('toc');
    key('Enter');
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      entry('Intro').blur();
    });
    act(() => void handle().editor.setBlocks(outline().filter((block) => block.id !== 'a')));
    expect(document.body).toHaveFocus();
    expect(sink()).not.toHaveFocus();
  });

  it('is left where it is when the focused entry stays', () => {
    const { nodeSelect, key, entry, handle } = mountToc(outline());
    nodeSelect('toc');
    key('Enter');
    act(() => void handle().editor.setBlocks(outline().filter((block) => block.id !== 'e')));
    expect(entry('Intro')).toHaveFocus();
  });
});
