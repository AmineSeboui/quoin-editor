import { act, fireEvent, screen } from '@testing-library/react';
import { Box } from 'lucide-react';
import { nodeSelection, textSelection } from '../../engine';
import { defineBlock } from '../../registry';
import { NATIVE_INTERACTION } from '../../view/selection/native-interaction';
import { bookmarkBlock, mountCanvas, paragraph, testBlockTypes } from './test-canvas';

const CONTROLS = ['summary', 'video', 'audio', 'editable', 'focusable', 'link', 'checkbox'];

const widgets = defineBlock({
  type: 'WIDGETS',
  label: 'Widgets',
  icon: Box,
  editor: () => <input aria-label="Widgets field" />,
  preview: () => (
    <div>
      <p>Plain words</p>
      <details>
        <summary>summary</summary>
      </details>
      <video data-testid="video" />
      <audio data-testid="audio" controls />
      <div contentEditable suppressContentEditableWarning>
        editable
      </div>
      <div tabIndex={0}>focusable</div>
      <span role="link">link</span>
      <span role="checkbox" aria-checked="false">
        checkbox
      </span>
    </div>
  ),
});

const control = (name: string) =>
  ['video', 'audio'].includes(name) ? screen.getByTestId(name) : screen.getByText(name);

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

  it('marks its root as a native interaction area while its editor is shown, and always for alwaysEditing', () => {
    const { nodeSelect, press } = mountCanvas([...doc, { id: 'n', type: 'PINNED', data: { note: 'Remember' } }]);
    const bookmark = screen.getByRole('group', { name: 'Bookmark' });
    expect(bookmark).not.toHaveAttribute(NATIVE_INTERACTION);
    nodeSelect('b');
    press('Enter');
    expect(bookmark).toHaveAttribute(NATIVE_INTERACTION, '');
    press('Escape', urlField()!);
    expect(bookmark).not.toHaveAttribute(NATIVE_INTERACTION);
    expect(screen.getByRole('group', { name: 'Pinned note' })).toHaveAttribute(NATIVE_INTERACTION, '');
  });

  it.each(CONTROLS)('leaves a click and a double click in a preview to the %s control under them', (name) => {
    const blocks = [paragraph('a', 'above'), { id: 'w', type: 'WIDGETS', data: {} }];
    const { handle, selection } = mountCanvas(blocks, { blockTypes: [...testBlockTypes, widgets] });
    act(() => handle().focus({ block: 'a', region: 'text', offset: 0 }));
    fireEvent.click(control(name));
    fireEvent.doubleClick(control(name));
    expect(selection()).toEqual(caretInA);
    expect(screen.queryByRole('textbox', { name: 'Widgets field' })).toBeNull();
    fireEvent.click(screen.getByText('Plain words'));
    expect(selection()).toEqual(nodeSelection('w'));
  });
});
