import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { insertText } from '../../engine/commands/insert-text';
import { coreExtensions } from '../../engine/extension/core-extensions';
import type { Extension } from '../../engine';
import { textSelection } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import type { BlockPlaceholder } from './block-placeholder';
import { defaultRenderers, type BlockRenderer } from './default-renderers';
import { Editor, hostOf, md } from './test-harness';

const caretIn = (block: string, offset: number) => textSelection({ block, region: 'text', offset });

function mount(blocks = [md('a', 'one'), md('b', 'two')], extensions?: readonly Extension[], renderers?: Record<string, BlockRenderer>) {
  let controller!: ViewController;
  const view = render(
    <Editor options={{ blocks, onChange: () => {}, extensions }} view={{ renderers }} onController={(c) => (controller = c)} />,
  );
  return { ...view, controller };
}

describe('EditableRegion', () => {
  it('renders a labelled, multi-line, spell-checked textbox that the browser may edit', () => {
    const { container } = mount();
    const host = hostOf(container, 'a');
    expect(host).toHaveAttribute('role', 'textbox');
    expect(host).toHaveAttribute('aria-multiline', 'true');
    expect(host).toHaveAttribute('aria-label', 'Paragraph');
    expect(host).toHaveAttribute('contenteditable', 'true');
    expect(host).toHaveAttribute('spellcheck', 'true');
    expect(host).toHaveAttribute('data-quoin-host');
  });

  it('fills the host from the model and re-renders it after a controller dispatch', () => {
    const { container, controller } = mount();
    const host = hostOf(container, 'a');
    expect(host.textContent).toBe('one');
    act(() => controller.run(insertText('x')));
    expect(host.textContent).toBe('xone');
  });

  it('shows a change that was dispatched on the editor itself, not through the controller', () => {
    const { container, controller } = mount();
    act(() => void controller.editor.insertText('x'));
    expect(hostOf(container, 'a').textContent).toBe('xone');
  });

  it('keeps the filled host, and the text node in it, when its parent renders again', () => {
    const { container, controller, rerender } = mount();
    const host = hostOf(container, 'a');
    const text = host.firstChild;
    rerender(
      <Editor options={{ blocks: [md('a', 'one'), md('b', 'two')], onChange: () => {} }} view={{ className: 'again' }} />,
    );
    expect(hostOf(container, 'a')).toBe(host);
    expect(host.firstChild).toBe(text);
    expect(controller.registry.get('a', 'text')).toBe(host);
  });

  it('reuses the text node when only its text changes', () => {
    const { container, controller } = mount();
    const host = hostOf(container, 'a');
    const text = host.firstChild;
    act(() => controller.run(insertText('x')));
    expect(host.firstChild).toBe(text);
  });

  it('forgets the host when it unmounts', () => {
    const { controller, unmount } = mount();
    expect(controller.registry.get('a', 'text')).toBeDefined();
    unmount();
    expect(controller.registry.get('a', 'text')).toBeUndefined();
  });

  it('shows the placeholder only while the region is empty', () => {
    const { container, controller } = mount([md('h', '## ')]);
    const host = hostOf(container, 'h');
    expect(host).toHaveAttribute('data-placeholder', 'Heading 2');
    expect(host.querySelector('br[data-quoin-filler]')).not.toBeNull();
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(caretIn('h', 0))));
    act(() => controller.run(insertText('T')));
    expect(host).not.toHaveAttribute('data-placeholder');
  });
});

describe('EditableRegion placeholders from the view', () => {
  const caretHolder: BlockPlaceholder = (state, block) =>
    state.selection?.kind === 'text' && state.selection.head.block === block.id ? `Write in ${block.id}` : undefined;
  const callout = { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: '' } };

  function mountPlaceholders(blockPlaceholder: BlockPlaceholder, readOnly = false) {
    let controller!: ViewController;
    const view = render(
      <Editor
        options={{ blocks: [md('a', ''), md('b', ''), callout], onChange: () => {}, readOnly }}
        view={{ blockPlaceholder }}
        onController={(c) => (controller = c)}
      />,
    );
    const host = (id: string) => view.container.querySelector(`[data-block-id="${id}"] [data-quoin-host]`)!;
    return { controller, host };
  }

  it('asks the view for the placeholder of each empty block, and follows the editor state', () => {
    const { controller, host } = mountPlaceholders(caretHolder);
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(caretIn('a', 0))));
    expect(host('a')).toHaveAttribute('data-placeholder', 'Write in a');
    expect(host('b')).not.toHaveAttribute('data-placeholder');
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(caretIn('b', 0))));
    expect(host('a')).not.toHaveAttribute('data-placeholder');
    expect(host('b')).toHaveAttribute('data-placeholder', 'Write in b');
  });

  it('gives a block with another main region its placeholder there', () => {
    const { host } = mountPlaceholders((_, block) => (block.type === 'CALLOUT' ? 'Callout' : undefined));
    expect(host('c')).toHaveAttribute('data-placeholder', 'Callout');
  });

  it('shows no placeholder while read-only', () => {
    const { host } = mountPlaceholders(() => 'Anything', true);
    for (const id of ['a', 'b', 'c']) expect(host(id)).not.toHaveAttribute('data-placeholder');
  });
});

describe('EditableRegion decorations', () => {
  const underline: Extension = {
    name: 'underline-caret-word',
    decorations: ({ selection }) =>
      selection?.kind === 'text'
        ? [{ kind: 'inline', block: selection.head.block, region: 'text', from: 0, to: 2, attrs: { class: 'mark' } }]
        : [],
  };

  it('repaints exactly the host whose decorations changed when the selection moves', () => {
    const { container, controller } = mount(undefined, [...coreExtensions(), underline]);
    const hosts = () => ['a', 'b'].map((id) => hostOf(container, id).querySelector('.mark')?.textContent ?? null);
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(caretIn('a', 1))));
    expect(hosts()).toEqual(['on', null]);
    const untouched = hostOf(container, 'b').firstChild;
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(caretIn('b', 1))));
    expect(hosts()).toEqual([null, 'tw']);
    expect(hostOf(container, 'b').firstChild).not.toBe(untouched);
  });

  it('paints decorations for a selection change made on the editor directly', () => {
    const { container, controller } = mount(undefined, [...coreExtensions(), underline]);
    act(() => controller.editor.dispatch(controller.editor.createTransaction().setSelection(caretIn('b', 0))));
    expect(hostOf(container, 'b').querySelector('.mark')?.textContent).toBe('tw');
  });
});

describe('BlockShell memoisation', () => {
  it('renders only the block that changed for a keystroke, and none for a selection move', () => {
    const renders: Record<string, number> = {};
    const Base = defaultRenderers.MARKDOWN;
    const Spy: BlockRenderer = (props) => {
      renders[props.block.id] = (renders[props.block.id] ?? 0) + 1;
      return <Base {...props} />;
    };
    const blocks = ['a', 'b', 'c', 'd'].map((id) => md(id, id.repeat(3)));
    const { controller } = mount(blocks, undefined, { MARKDOWN: Spy });
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(caretIn('a', 1))));
    const before = { ...renders };
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(caretIn('c', 2))));
    expect(renders).toEqual(before);
    act(() => controller.run(insertText('!')));
    expect(renders.c).toBe(before.c + 1);
    expect({ ...renders, c: 0 }).toEqual({ ...before, c: 0 });
  });
});
