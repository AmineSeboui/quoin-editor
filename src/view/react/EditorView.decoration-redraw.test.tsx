import { act, render } from '@testing-library/react';
import { coreExtensions, defineExtension, type Decoration, type EditorState } from '../../engine';
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

describe('a selection the browser made, once a decoration redraws what it covers', () => {
  it('is drawn again where it was, so the next key acts on what was selected', () => {
    let controller: ViewController | null = null;
    const { container } = render(
      <Stateful
        blocks={[md('a', 'Area $x$')]}
        options={{ extensions: [...coreExtensions(), wrapSelection] }}
        onController={(created) => (controller = created)}
      />,
    );
    const host = hostOf(container, 'a');
    act(() => host.focus());
    act(() => {
      document.getSelection()!.setBaseAndExtent(host, 2, host, 1);
      controller!.readSelectionFromDom();
    });
    expect(host.querySelector('[data-wrapped] [data-quoin-atom]')).not.toBeNull();
    const { anchorNode, anchorOffset, focusNode, focusOffset } = document.getSelection()!;
    const map = domMapOf(host)!;
    expect([map.fromDom(anchorNode!, anchorOffset), map.fromDom(focusNode!, focusOffset)]).toEqual([6, 5]);
  });
});
