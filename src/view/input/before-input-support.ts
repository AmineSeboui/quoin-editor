import { createEditor } from '../../engine/extension/editor';
import { inlineText } from '../../engine/model/inline';
import { textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';

export function setup(markdown = 'hi') {
  const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown } }] });
  const controller = new ViewController({ editor });
  const host = document.createElement('div');
  host.contentEditable = 'true';
  document.body.appendChild(host);
  controller.registry.register('a', 'text', host);
  controller.renderHost('a', 'text');
  controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: markdown.length })));
  const text = () => inlineText(editor.state.doc.blocks[0].regions.text);
  return { editor, controller, host, text };
}

export const input = (inputType: string, data: string | null = null) =>
  new InputEvent('beforeinput', { inputType, data, cancelable: true, bubbles: true });

export function targeting(event: InputEvent, node: Node, from: number, to: number): InputEvent {
  const range = { startContainer: node, startOffset: from, endContainer: node, endOffset: to, collapsed: from === to };
  Object.defineProperty(event, 'getTargetRanges', { value: () => [range] });
  return event;
}

export function carrying(event: InputEvent, text: string): InputEvent {
  Object.defineProperty(event, 'dataTransfer', { value: { getData: (type: string) => (type === 'text/plain' ? text : '') } });
  return event;
}

export function select({ controller, editor }: ReturnType<typeof setup>, anchor: number, head = anchor): void {
  const at = (offset: number) => ({ block: 'a', region: 'text', offset });
  controller.dispatch(editor.createTransaction().setSelection(textSelection(at(anchor), at(head))));
}
