import { act, render } from '@testing-library/react';
import { coreExtensions, defineExtension, type Decoration, type EditorState } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { Stateful, md } from './test-harness';

const MARKED = { 'data-marked': 'yes', 'data-type': 'not-mine' };

// Marks every block but the one holding the caret.
const markOthers = defineExtension({
  name: 'mark-others',
  decorations: ({ doc, selection }: EditorState): Decoration[] => {
    const at = selection?.kind === 'text' ? selection.head.block : null;
    return doc.blocks.filter(({ id }) => id !== at).map(({ id }) => ({ kind: 'block', block: id, attrs: MARKED }));
  },
});

function mount() {
  let controller: ViewController | null = null;
  const { container } = render(
    <Stateful
      blocks={[md('a', 'one'), md('b', 'two'), md('c', 'three')]}
      options={{ extensions: [...coreExtensions(), markOthers] }}
      onController={(created) => (controller = created)}
    />,
  );
  const marked = () =>
    [...container.querySelectorAll('[data-block-id]')].map((shell) => shell.getAttribute('data-marked'));
  return { controller: () => controller!, marked, container };
}

const caretIn = (controller: ViewController, block: string) =>
  act(() =>
    controller.editor.commands.setSelection({
      kind: 'text',
      anchor: { block, region: 'text', offset: 0 },
      head: { block, region: 'text', offset: 0 },
    }),
  );

describe('a block decoration', () => {
  it('writes its attributes on the element of its block, and moves with the state', () => {
    const { controller, marked } = mount();
    caretIn(controller(), 'a');
    expect(marked()).toEqual([null, 'yes', 'yes']);
    caretIn(controller(), 'b');
    expect(marked()).toEqual(['yes', null, 'yes']);
    caretIn(controller(), 'c');
    expect(marked()).toEqual(['yes', 'yes', null]);
  });

  it('leaves the attributes of the block itself to the block', () => {
    const { container } = mount();
    const shell = container.querySelector('[data-block-id="a"]')!;
    expect(shell.getAttribute('data-type')).toBe('MARKDOWN');
  });
});
