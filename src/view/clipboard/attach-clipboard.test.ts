import { afterEach, describe, expect, it } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { blockRangeSelection, textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';
import { readSliceHTML } from './slice-marker';
import { clipboardEvent, dragEvent, fakeTransfer } from './test-transfer';

const detachers: (() => void)[] = [];

afterEach(() => {
  detachers.splice(0).forEach((detach) => detach());
  document.body.replaceChildren();
});

function mount(readOnly = false) {
  const editor = createEditor({
    blocks: [
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'alpha' } },
      { id: 'b', type: 'MARKDOWN', data: { markdown: 'beta' } },
    ],
  });
  const controller = new ViewController({ editor, readOnly });
  const root = document.createElement('div');
  const host = document.createElement('div');
  const field = document.createElement('input');
  root.append(host, field);
  document.body.appendChild(root);
  controller.registry.register('a', 'text', host);
  controller.renderHost('a', 'text');
  detachers.push(controller.attach(root));
  const pos = (offset: number) => ({ block: 'a', region: 'text', offset });
  const select = (from: number, to: number) =>
    controller.dispatch(editor.createTransaction().setSelection(textSelection(pos(from), pos(to))));
  const markdown = () => editor.getBlocks().map((block) => block.data.markdown);
  return { editor, controller, root, host, field, select, markdown };
}

describe('attached clipboard', () => {
  it('copies the model selection from a host with the slice marker in the HTML', () => {
    const { host, select } = mount();
    select(1, 4);
    const { transfer, store } = fakeTransfer();
    const event = clipboardEvent('copy', transfer);
    host.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(store.get('text/plain')).toBe('lph');
    expect(readSliceHTML(store.get('text/html')!)).toBe(store.get('application/x-quoin+json'));
  });

  it('cuts the selection', () => {
    const { host, select, markdown } = mount();
    select(0, 2);
    host.dispatchEvent(clipboardEvent('cut', fakeTransfer().transfer));
    expect(markdown()).toEqual(['pha', 'beta']);
  });

  it('cuts selected blocks whole', () => {
    const { host, editor, controller, markdown } = mount();
    controller.dispatch(editor.createTransaction().setSelection(blockRangeSelection('a')));
    const { transfer, store } = fakeTransfer();
    host.dispatchEvent(clipboardEvent('cut', transfer));
    expect(store.get('text/plain')).toBe('alpha');
    expect(markdown()).toEqual(['beta']);
  });

  it('pastes at the caret', () => {
    const { host, select, markdown } = mount();
    select(5, 5);
    const event = clipboardEvent('paste', fakeTransfer({ 'text/plain': '!' }).transfer);
    host.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(markdown()).toEqual(['alpha!', 'beta']);
  });

  it('leaves the clipboard of a field inside the editor alone', () => {
    const { field, select, markdown } = mount();
    select(0, 5);
    for (const type of ['copy', 'cut', 'paste'] as const) {
      const event = clipboardEvent(type, fakeTransfer({ 'text/plain': 'x' }).transfer);
      field.dispatchEvent(event);
      expect(event.defaultPrevented, type).toBe(false);
    }
    expect(markdown()).toEqual(['alpha', 'beta']);
  });

  it('only copies when the editor is read-only', () => {
    const { host, root, select, markdown } = mount(true);
    select(0, 5);
    const copy = clipboardEvent('copy', fakeTransfer().transfer);
    host.dispatchEvent(copy);
    expect(copy.defaultPrevented).toBe(true);
    for (const event of [
      clipboardEvent('cut', fakeTransfer().transfer),
      clipboardEvent('paste', fakeTransfer({ 'text/plain': 'x' }).transfer),
      dragEvent('dragover', fakeTransfer({ 'text/plain': 'x' }).transfer),
      dragEvent('drop', fakeTransfer({ 'text/plain': 'x' }).transfer),
    ]) {
      root.dispatchEvent(event);
      host.dispatchEvent(event);
      expect(event.defaultPrevented, event.type).toBe(false);
    }
    expect(markdown()).toEqual(['alpha', 'beta']);
  });

  it('allows a drop anywhere in the editor except onto a field', () => {
    const { root, field } = mount();
    const over = dragEvent('dragover', fakeTransfer({ 'text/plain': 'x' }).transfer);
    root.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    const onField = dragEvent('dragover', fakeTransfer({ 'text/plain': 'x' }).transfer);
    field.dispatchEvent(onField);
    expect(onField.defaultPrevented).toBe(false);
  });

  it('prevents a drag that starts in a host and no other', () => {
    const { host, field } = mount();
    const inHost = dragEvent('dragstart', null);
    host.firstChild!.dispatchEvent(inHost);
    expect(inHost.defaultPrevented).toBe(true);
    const inField = dragEvent('dragstart', null);
    field.dispatchEvent(inField);
    expect(inField.defaultPrevented).toBe(false);
  });

  it('stops listening once detached', () => {
    const { host, controller, root, select } = mount();
    select(0, 2);
    const detach = controller.attach(root);
    detach();
    const event = clipboardEvent('copy', fakeTransfer().transfer);
    host.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
