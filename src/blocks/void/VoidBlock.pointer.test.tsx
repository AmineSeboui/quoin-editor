import { act, fireEvent, screen } from '@testing-library/react';
import { nodeSelection, textSelection } from '../../engine';
import { bookmarkBlock, mountCanvas, paragraph } from './test-canvas';

const doc = [paragraph('a', 'above'), bookmarkBlock('b', 'quoin.dev'), { id: 'l', type: 'LINK_PREVIEW', data: { url: 'x.dev' } }];
const urlField = () => screen.queryByRole('textbox', { name: 'Bookmark URL' });
const caretInA = textSelection({ block: 'a', region: 'text', offset: 0 });

describe('VoidBlock under the pointer', () => {
  it('node-selects the block when its preview is clicked, and focuses its shell', () => {
    const { handle, selection, shell } = mountCanvas(doc);
    act(() => handle().focus({ block: 'a', region: 'text', offset: 0 }));
    fireEvent.click(screen.getByText('Link to quoin.dev'));
    expect(selection()).toEqual(nodeSelection('b'));
    expect(document.activeElement).toBe(shell('b'));
    expect(urlField()).toBeNull();
  });

  it('opens the editor on a double click and on its Edit button, node-selecting the block', () => {
    const { handle, selection, press } = mountCanvas(doc);
    act(() => handle().focus({ block: 'a', region: 'text', offset: 0 }));
    fireEvent.doubleClick(screen.getByText('Link to quoin.dev'));
    expect(document.activeElement).toBe(urlField());
    expect(selection()).toEqual(nodeSelection('b'));
    press('Escape', urlField()!);
    act(() => handle().focus({ block: 'a', region: 'text', offset: 0 }));
    expect(selection()).toEqual(caretInA);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Bookmark' }));
    expect(document.activeElement).toBe(urlField());
    expect(selection()).toEqual(nodeSelection('b'));
  });

  it('keeps its Edit button out of the tab order and names it from the labels', () => {
    mountCanvas(doc, { labels: { editBlock: (label) => `Modifier ${label}` } });
    expect(screen.getByRole('button', { name: 'Modifier Bookmark' })).toHaveAttribute('tabindex', '-1');
  });

  it('offers no way into a block whose definition has no editor', () => {
    const { nodeSelect, press, changes } = mountCanvas(doc);
    expect(screen.queryByRole('button', { name: 'Edit Link preview' })).toBeNull();
    fireEvent.doubleClick(screen.getByText('Preview of x.dev'));
    expect(screen.getByRole('group', { name: 'Link preview' })).toHaveTextContent('Preview of x.dev');
    nodeSelect('l');
    press('Enter');
    expect(changes).toHaveLength(1);
    expect(changes[0].map((block) => block.type)).toEqual(['MARKDOWN', 'BOOKMARK', 'LINK_PREVIEW', 'MARKDOWN']);
  });
});
