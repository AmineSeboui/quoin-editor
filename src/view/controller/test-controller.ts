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

export function mountController(markdown = 'hi') {
  const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown } }] });
  const controller = new ViewController({ editor });
  const root = document.createElement('div');
  const host = document.createElement('div');
  host.contentEditable = 'true';
  root.appendChild(host);
  document.body.appendChild(root);
  detachAfterTest(controller.attach(root));
  controller.registry.register('a', 'text', host);
  controller.renderHost('a', 'text');
  return { controller, editor, host, root };
}

export const at = (offset: number, block = 'a') => ({ block, region: 'text', offset });

export const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));
