import { createEditor } from '../../engine/extension/editor';
import { ViewController } from './view-controller';

const detachers: (() => void)[] = [];

export function detachAfterTest(detach: () => void): void {
  detachers.push(detach);
}

export function cleanUpAfterTest(): void {
  detachers.splice(0).forEach((detach) => detach());
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
}

export function mountController(markdown = 'hi', doc: Document = document) {
  const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown } }] });
  const controller = new ViewController({ editor });
  const root = doc.createElement('div');
  const host = doc.createElement('div');
  host.contentEditable = 'true';
  root.appendChild(host);
  doc.body.appendChild(root);
  detachAfterTest(controller.attach(root));
  controller.registry.register('a', 'text', host);
  controller.renderHost('a', 'text');
  return { controller, editor, host, root };
}

export const at = (offset: number, block = 'a') => ({ block, region: 'text', offset });

export const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A document of its own, as a canvas a host renders into an iframe sees it. */
export function framedDocument(): Document {
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  return frame.contentDocument!;
}
