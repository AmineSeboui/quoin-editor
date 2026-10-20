import { fireEvent } from '@testing-library/react';
import { createCanvasUiStore } from '../../canvas/ui-store';
import { blockRangeSelection, coreExtensions, createEditor, textSelection, type Selection } from '../../engine';
import { ViewController } from '../../view';
import { at, cleanUpAfterTest, detachAfterTest } from '../../view/controller/test-controller';
import { linkExtension } from './link-extension';

function mount(isMac: boolean, selection: Selection = textSelection(at(0), at(5))) {
  const store = createCanvasUiStore();
  const editor = createEditor({
    blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'hello world' } }],
    extensions: [...coreExtensions(), linkExtension(store)],
    isMac,
  });
  const controller = new ViewController({ editor, isMac });
  const root = document.createElement('div');
  const host = document.createElement('div');
  host.contentEditable = 'true';
  root.appendChild(host);
  document.body.appendChild(root);
  detachAfterTest(controller.attach(root));
  controller.registry.register('a', 'text', host);
  controller.renderHost('a', 'text');
  controller.dispatch(editor.createTransaction().setSelection(selection));
  const prevented = (modifiers: { metaKey?: boolean; ctrlKey?: boolean }) =>
    !fireEvent.keyDown(host, { key: 'k', code: 'KeyK', ...modifiers });
  return { store, prevented, isOpen: () => store.get().linkPopover.open };
}

afterEach(cleanUpAfterTest);

describe('the link shortcut', () => {
  it('opens the link popover on Cmd+K on a Mac and leaves Ctrl+K, which deletes to the line end, to the text', () => {
    const { prevented, isOpen } = mount(true);
    expect(prevented({ ctrlKey: true })).toBe(false);
    expect(isOpen()).toBe(false);
    expect(prevented({ metaKey: true })).toBe(true);
    expect(isOpen()).toBe(true);
  });

  it('opens the link popover on Ctrl+K away from a Mac and leaves Meta+K alone', () => {
    const { prevented, isOpen } = mount(false);
    expect(prevented({ metaKey: true })).toBe(false);
    expect(isOpen()).toBe(false);
    expect(prevented({ ctrlKey: true })).toBe(true);
    expect(isOpen()).toBe(true);
  });

  it('opens at a collapsed caret too', () => {
    const { prevented, isOpen } = mount(false, textSelection(at(3)));
    expect(prevented({ ctrlKey: true })).toBe(true);
    expect(isOpen()).toBe(true);
  });

  it('lets the key through when whole blocks are selected', () => {
    const { prevented, isOpen } = mount(false, blockRangeSelection('a', 'a'));
    expect(prevented({ ctrlKey: true })).toBe(false);
    expect(isOpen()).toBe(false);
  });
});
