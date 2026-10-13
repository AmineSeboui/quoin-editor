import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';
import { createCompositionHandlers } from './composition';

afterEach(() => document.body.replaceChildren());

function setup() {
  const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'x' } }] });
  const controller = new ViewController({ editor });
  const host = document.createElement('div');
  document.body.appendChild(host);
  controller.registry.register('a', 'text', host);
  controller.renderHost('a', 'text');
  controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 1 })));
  const compose = (data: string) => {
    const node = host.firstChild as Text;
    node.data = data;
    document.getSelection()!.setBaseAndExtent(node, data.length, node, data.length);
  };
  return { editor, controller, host, compose, composition: createCompositionHandlers(controller) };
}

describe('composition', () => {
  it('does not render the composing host and reconciles it when composition ends', async () => {
    vi.useFakeTimers();
    const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'x' } }] });
    const controller = new ViewController({ editor });
    const host = document.createElement('div');
    document.body.appendChild(host);
    controller.registry.register('a', 'text', host);
    controller.renderHost('a', 'text');
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 1 })));
    const composition = createCompositionHandlers(controller);
    composition.start(new CompositionEvent('compositionstart'));
    expect(controller.composingKey).not.toBeNull();
    (host.firstChild as Text).data = 'x日本';
    document.getSelection()!.setBaseAndExtent(host.firstChild!, 3, host.firstChild!, 3);
    composition.end(new CompositionEvent('compositionend', { data: '日本' }));
    await vi.runAllTimersAsync();
    expect(controller.composingKey).toBeNull();
    expect(editor.getBlocks()[0].data.markdown).toBe('x日本');
    vi.useRealTimers();
  });

  it('settles on the input event that follows compositionend without waiting for the timeout', () => {
    const { editor, controller, host, compose, composition } = setup();
    composition.start(new CompositionEvent('compositionstart'));
    expect(composition.active).toBe(true);
    compose('x\u00e9');
    composition.end(new CompositionEvent('compositionend', { data: '\u00e9' }));
    expect(composition.active).toBe(true);
    host.dispatchEvent(new InputEvent('input', { inputType: 'insertFromComposition', data: '\u00e9' }));
    expect(composition.active).toBe(false);
    expect(controller.composingKey).toBeNull();
    expect(editor.getBlocks()[0].data.markdown).toBe('x\u00e9');
  });

  it('settles a composition still waiting when the next one starts', () => {
    const { editor, controller, compose, composition } = setup();
    composition.start(new CompositionEvent('compositionstart'));
    compose('x\u65e5');
    composition.end(new CompositionEvent('compositionend', { data: '\u65e5' }));
    composition.start(new CompositionEvent('compositionstart'));
    expect(editor.getBlocks()[0].data.markdown).toBe('x\u65e5');
    expect(controller.composingKey).not.toBeNull();
  });
});
