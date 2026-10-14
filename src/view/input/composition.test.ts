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

  it('stops following the editor once released', () => {
    const { editor, composition } = setup();
    const subscribe = editor.subscribe.bind(editor);
    const stops: (() => void)[] = [];
    vi.spyOn(editor, 'subscribe').mockImplementation((listener) => {
      const stop = vi.fn(subscribe(listener));
      stops.push(stop);
      return stop;
    });
    composition.start(new CompositionEvent('compositionstart'));
    expect(stops).toHaveLength(1);
    composition.release();
    expect(stops[0]).toHaveBeenCalledTimes(1);
  });

  it('drops a composition that is still running when released, leaving the model as it was', async () => {
    vi.useFakeTimers();
    const { editor, controller, host, compose, composition } = setup();
    composition.start(new CompositionEvent('compositionstart'));
    compose('x\u65e5');
    composition.release();
    expect(composition.active).toBe(false);
    expect(controller.composingKey).toBeNull();
    composition.end(new CompositionEvent('compositionend', { data: '\u65e5' }));
    await vi.runAllTimersAsync();
    expect(editor.getBlocks()[0].data.markdown).toBe('x');
    host.dispatchEvent(new InputEvent('input', { inputType: 'insertFromComposition' }));
    expect(editor.getBlocks()[0].data.markdown).toBe('x');
    vi.useRealTimers();
  });

  it('settles a composition that had ended and was waiting for its input event when released', async () => {
    vi.useFakeTimers();
    const { editor, controller, compose, composition } = setup();
    composition.start(new CompositionEvent('compositionstart'));
    compose('x\u65e5');
    composition.end(new CompositionEvent('compositionend', { data: '\u65e5' }));
    composition.release();
    expect(editor.getBlocks()[0].data.markdown).toBe('x\u65e5');
    expect(composition.active).toBe(false);
    expect(controller.composingKey).toBeNull();
    await vi.runAllTimersAsync();
    expect(editor.getBlocks()[0].data.markdown).toBe('x\u65e5');
    vi.useRealTimers();
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

describe('a composition the model changed under', () => {
  function composing(markdown: string, caret: number, end = caret) {
    const editor = createEditor({ blocks: [{ id: 'p', type: 'MARKDOWN', data: { markdown } }] });
    const controller = new ViewController({ editor });
    const host = document.createElement('div');
    document.body.appendChild(host);
    controller.registry.register('p', 'text', host);
    controller.renderHost('p', 'text');
    const at = (offset: number) => ({ block: 'p', region: 'text', offset });
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(caret), at(end))));
    const composition = createCompositionHandlers(controller);
    composition.start(new CompositionEvent('compositionstart'));
    const first = host.firstChild as Text;
    let composed = end - caret;
    const compose = (data: string) => {
      first.replaceData(caret, composed, data);
      composed = data.length;
      document.getSelection()!.collapse(first, caret + data.length);
    };
    const commit = (data: string) => {
      compose(data);
      composition.end(new CompositionEvent('compositionend', { data }));
      host.dispatchEvent(new InputEvent('input', { inputType: 'insertFromComposition', data }));
    };
    const markdownOf = () => editor.getBlocks()[0].data.markdown;
    return { editor, controller, host, at, compose, commit, markdownOf };
  }

  it('keeps what the page wrote into the block, and every mark after the caret', () => {
    const { editor, host, compose, commit, markdownOf } = composing('A paragraph with **bold**, _italic_ and `code`.', 2);
    compose('かん');
    editor.setBlocks([{ id: 'p', type: 'MARKDOWN', data: { markdown: 'A paragraph with **bold**, _italic_ and `code`. REMOTE' } }]);
    commit('漢字');
    expect(markdownOf()).toBe('A 漢字paragraph with **bold**, _italic_ and `code`. REMOTE');
    expect(host.textContent).toBe('A 漢字paragraph with bold, italic and code. REMOTE');
  });

  it('puts the composed text where the changes made since moved its place', () => {
    const { editor, controller, at, compose, commit, markdownOf } = composing('one two', 4);
    compose('か');
    editor.chain().setSelection(textSelection(at(0))).insertText('zero ').run();
    commit('火');
    expect(markdownOf()).toBe('zero one 火two');
    expect(controller.editor.state.selection).toEqual(textSelection(at(10)));
  });

  it('replaces only the range it was composed over', () => {
    const { editor, compose, commit, markdownOf } = composing('one two three', 4, 7);
    compose('か');
    editor.setBlocks([{ id: 'p', type: 'MARKDOWN', data: { markdown: 'one two three four' } }]);
    commit('火');
    expect(markdownOf()).toBe('one 火 three four');
  });
});
