import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { blockRangeSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';
import { handleDragOver, handleDragStart, handleDrop } from './drop-events';
import { dragEvent, fakeTransfer } from './test-transfer';

const doc = document as unknown as Record<string, unknown>;

const detachers: (() => void)[] = [];

afterEach(() => {
  detachers.splice(0).forEach((detach) => detach());
  delete doc.elementFromPoint;
  delete doc.caretPositionFromPoint;
  document.body.replaceChildren();
});

const rect = { top: 0, bottom: 20, left: 0, right: 100, width: 100, height: 20, x: 0, y: 0 } as DOMRect;

function mount(onFiles?: (files: File[], at: unknown) => void) {
  const editor = createEditor({
    blocks: [
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'alpha' } },
      { id: 'b', type: 'MARKDOWN', data: { markdown: 'beta' } },
    ],
  });
  const controller = new ViewController({ editor, onFiles });
  const root = document.createElement('div');
  document.body.appendChild(root);
  detachers.push(controller.attach(root));
  const hosts = Object.fromEntries(
    ['a', 'b'].map((id) => {
      const host = document.createElement('div');
      host.contentEditable = 'true';
      host.getBoundingClientRect = () => rect;
      root.appendChild(host);
      controller.registry.register(id, 'text', host);
      controller.renderHost(id, 'text');
      return [id, host];
    }),
  );
  const dropAt = (host: HTMLElement, offset: number) => {
    doc.elementFromPoint = () => host;
    doc.caretPositionFromPoint = () => ({ offsetNode: host.firstChild, offset });
  };
  return { editor, controller, hosts, dropAt, markdown: () => editor.getBlocks().map((block) => block.data.markdown) };
}

describe('dropping data', () => {
  it('inserts text where it lands and puts the caret after it', () => {
    const { editor, controller, hosts, dropAt, markdown } = mount();
    dropAt(hosts.b, 2);
    const event = dragEvent('drop', fakeTransfer({ 'text/plain': 'X' }).transfer, 5, 10);
    handleDrop(controller, event);
    expect(event.defaultPrevented).toBe(true);
    expect(markdown()).toEqual(['alpha', 'beXta']);
    expect(editor.state.selection).toMatchObject({ kind: 'text', head: { block: 'b', offset: 3 } });
  });

  it('replaces a block selection with what is dropped elsewhere by moving the caret first', () => {
    const { editor, controller, hosts, dropAt, markdown } = mount();
    controller.dispatch(editor.createTransaction().setSelection(blockRangeSelection('a', 'b')));
    dropAt(hosts.a, 0);
    handleDrop(controller, dragEvent('drop', fakeTransfer({ 'text/plain': 'X' }).transfer, 1, 10));
    expect(markdown()).toEqual(['Xalpha', 'beta']);
  });

  it('puts the caret at the end of the nearest host when the browser finds no position', () => {
    const { controller, hosts, dropAt, markdown } = mount();
    dropAt(hosts.a, 0);
    doc.caretPositionFromPoint = () => null;
    handleDrop(controller, dragEvent('drop', fakeTransfer({ 'text/plain': '!' }).transfer, 500, 10));
    expect(markdown()).toEqual(['alpha!', 'beta']);
  });

  it('hands dropped files to onFiles with the position they landed on', () => {
    const onFiles = vi.fn();
    const { controller, hosts, dropAt, markdown } = mount(onFiles);
    dropAt(hosts.b, 1);
    const file = new File(['x'], 'cat.png', { type: 'image/png' });
    handleDrop(controller, dragEvent('drop', fakeTransfer({}, [file]).transfer, 5, 10));
    expect(onFiles).toHaveBeenCalledWith([file], { block: 'b', region: 'text', offset: 1 });
    expect(markdown()).toEqual(['alpha', 'beta']);
  });

  it('still cancels a drop that carries no data transfer', () => {
    const { controller } = mount();
    const event = dragEvent('drop', null);
    handleDrop(controller, event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('dragging', () => {
  it('allows a drop that carries files, text or HTML and no other', () => {
    for (const [type, value] of [['text/plain', 'x'], ['text/html', '<p>x</p>']]) {
      const event = dragEvent('dragover', fakeTransfer({ [type]: value }).transfer);
      handleDragOver(event);
      expect(event.defaultPrevented, type).toBe(true);
    }
    const files = dragEvent('dragover', fakeTransfer({}, [new File(['x'], 'a.png')]).transfer);
    handleDragOver(files);
    expect(files.defaultPrevented).toBe(true);
    for (const transfer of [fakeTransfer({ 'text/uri-list': 'https://x.y' }).transfer, null]) {
      const event = dragEvent('dragover', transfer);
      handleDragOver(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('prevents a text drag from starting inside a host', () => {
    const event = dragEvent('dragstart', null);
    handleDragStart(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
