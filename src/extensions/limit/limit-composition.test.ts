import { coreExtensions, createEditor, defineExtension, textSelection } from '../../engine';
import { ViewController } from '../../view';
import { createCompositionHandlers } from '../../view/input/composition';
import { createLimit } from './limit-plugin';

afterEach(() => document.body.replaceChildren());

function composing(limit: number) {
  const guard = createLimit(limit);
  const extensions = [
    ...coreExtensions(),
    defineExtension({ name: 'limit', filterTransaction: guard.filterTransaction }),
  ];
  const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'ab' } }], extensions });
  const controller = new ViewController({ editor });
  const host = document.createElement('div');
  document.body.appendChild(host);
  controller.registry.register('a', 'text', host);
  controller.renderHost('a', 'text');
  controller.dispatch(
    editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 2 })),
  );
  const composition = createCompositionHandlers(controller);
  const commit = (composed: string) => {
    composition.start(new CompositionEvent('compositionstart'));
    const node = host.firstChild as Text;
    node.data = `ab${composed}`;
    document.getSelection()!.setBaseAndExtent(node, node.data.length, node, node.data.length);
    composition.end(new CompositionEvent('compositionend', { data: composed }));
    host.dispatchEvent(new InputEvent('input', { inputType: 'insertFromComposition', data: composed }));
  };
  return { editor, host, commit };
}

describe('a composition under a character limit', () => {
  it('is never cut: the whole commit is refused and the line is drawn again from the model', () => {
    const { editor, host, commit } = composing(3);
    commit('\u65e5\u672c');
    expect(editor.getBlocks()[0].data.markdown).toBe('ab');
    expect(host.textContent).toBe('ab');
  });

  it('commits whole when it fits', () => {
    const { editor, host, commit } = composing(4);
    commit('\u65e5\u672c');
    expect(editor.getBlocks()[0].data.markdown).toBe('ab\u65e5\u672c');
    expect(host.textContent).toBe('ab\u65e5\u672c');
  });
});
