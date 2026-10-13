import { afterEach, describe, expect, it } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { inlineText } from '../../engine/model/inline';
import { hostKey } from '../controller/host-registry';
import { ViewController } from '../controller/view-controller';
import { createDomInputFallback } from './dom-input';

afterEach(() => document.body.replaceChildren());

function setup() {
  let changes = 0;
  const editor = createEditor({
    blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'ab' } }],
    onTransaction: (tr) => void (changes += tr.docChanged ? 1 : 0),
  });
  const controller = new ViewController({ editor });
  const host = document.createElement('div');
  document.body.appendChild(host);
  controller.registry.register('a', 'text', host);
  controller.renderHost('a', 'text');
  const fallback = createDomInputFallback(controller);
  host.addEventListener('input', (event) => fallback.onInput(event as InputEvent));
  const edit = (data: string) => {
    const node = host.firstChild as Text;
    node.data = data;
    document.getSelection()!.collapse(node, data.length);
  };
  const text = () => inlineText(editor.state.doc.blocks[0].regions.text);
  return { controller, host, fallback, edit, text, changes: () => changes };
}

const typed = (inputType = 'insertText', isComposing = false) =>
  new InputEvent('input', { inputType, isComposing, bubbles: true });
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('DOM input fallback', () => {
  it('reads an edit the browser made on the microtask after its input event, once per host', async () => {
    const { host, edit, text, changes } = setup();
    edit('abc');
    host.dispatchEvent(typed());
    edit('abcd');
    host.dispatchEvent(typed());
    expect(text()).toBe('ab');
    await Promise.resolve();
    expect(text()).toBe('abcd');
    expect(changes()).toBe(1);
  });

  it('reads changes a mutation observer reports until it is stopped', async () => {
    const { fallback, host, edit, text } = setup();
    const stop = fallback.observe(host);
    edit('abc');
    await nextTask();
    expect(text()).toBe('abc');
    stop();
    edit('abcd');
    await nextTask();
    expect(text()).toBe('abc');
  });

  it('leaves input events that belong to a composition alone', async () => {
    const { host, edit, text } = setup();
    edit('abc');
    host.dispatchEvent(typed('insertCompositionText', true));
    await nextTask();
    expect(text()).toBe('ab');
  });

  it('leaves the host to the composition while one is active', async () => {
    const { controller, fallback, host, edit, text } = setup();
    controller.composingKey = hostKey('a', 'text');
    fallback.observe(host);
    edit('abc');
    host.dispatchEvent(typed());
    await nextTask();
    expect(text()).toBe('ab');
  });

  it('flushes pending edits, including records not delivered yet, right away', () => {
    const { fallback, host, edit, text } = setup();
    fallback.observe(host);
    edit('abc');
    fallback.flush();
    expect(text()).toBe('abc');
  });
});
