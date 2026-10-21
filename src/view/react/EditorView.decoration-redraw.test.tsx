import { act, render } from '@testing-library/react';
import { coreExtensions, defineExtension, textSelection, type Decoration, type EditorState } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { domMapOf } from '../dom/render-inline';
import { hostOf, md, Stateful } from './test-harness';

// Draws a wrapper round whatever the selection covers in its line, as a highlight of a selected atom does.
const wrapSelection = defineExtension({
  name: 'wrap-selection',
  decorations: ({ selection }: EditorState): Decoration[] => {
    if (selection?.kind !== 'text' || selection.anchor.offset === selection.head.offset) return [];
    const [from, to] = [selection.anchor.offset, selection.head.offset].sort((a, b) => a - b);
    return [{ kind: 'inline', block: 'a', region: 'text', from, to, attrs: { 'data-wrapped': '' } }];
  },
});

function mount() {
  let controller: ViewController | null = null;
  const { container } = render(
    <Stateful
      blocks={[md('a', 'Area $x$ here')]}
      options={{ extensions: [...coreExtensions(), wrapSelection] }}
      onController={(created) => (controller = created)}
    />,
  );
  return { controller: () => controller!, host: hostOf(container, 'a') };
}

describe('a selection the browser made, once a decoration redraws what it covers', () => {
  it('is drawn again where it was, so the next key acts on what was selected', () => {
    const { controller: current, host } = mount();
    const controller = current();
    act(() => host.focus());
    act(() => {
      document.getSelection()!.setBaseAndExtent(host, 2, host, 1);
      controller.readSelectionFromDom();
    });
    expect(host.querySelector('[data-wrapped] [data-quoin-atom]')).not.toBeNull();
    const { anchorNode, anchorOffset, focusNode, focusOffset } = document.getSelection()!;
    const map = domMapOf(host)!;
    expect([map.fromDom(anchorNode!, anchorOffset), map.fromDom(focusNode!, focusOffset)]).toEqual([6, 5]);
  });

  it('is left as it is while focus is outside the editor, so no write pulls focus into it', () => {
    const { controller: current, host } = mount();
    const controller = current();
    act(() => host.focus());
    act(() => {
      document.getSelection()!.collapse(host.firstChild!, 2);
      controller.readSelectionFromDom();
    });
    // A press on a part of the page that takes no focus leaves the browser's selection in the line.
    act(() => {
      host.blur();
      document.getSelection()!.collapse(host.firstChild!, 2);
    });
    const over = textSelection({ block: 'a', region: 'text', offset: 5 }, { block: 'a', region: 'text', offset: 6 });
    act(() => controller.editor.dispatch(controller.editor.createTransaction().setSelection(over)));
    expect(host.querySelector('[data-wrapped]')).not.toBeNull();
    expect(document.activeElement).toBe(document.body);
    const { anchorNode, anchorOffset, isCollapsed } = document.getSelection()!;
    expect([anchorNode, anchorOffset, isCollapsed]).toEqual([host.firstChild, 2, true]);
  });
});
