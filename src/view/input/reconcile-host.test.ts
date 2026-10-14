import { describe, expect, it, vi } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { ViewController } from '../controller/view-controller';
import { reconcileHost } from './reconcile-host';

describe('reconcileHost', () => {
  it('turns a DOM edit made by the browser into a transaction that keeps marks', () => {
    const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: '**ab**' } }] });
    const controller = new ViewController({ editor });
    const host = document.createElement('div');
    document.body.appendChild(host);
    controller.registry.register('a', 'text', host);
    controller.renderHost('a', 'text');
    const textNode = host.querySelector('strong')!.firstChild as Text;
    textNode.data = 'aXb';
    document.getSelection()!.setBaseAndExtent(textNode, 2, textNode, 2);
    expect(reconcileHost(controller, 'a', 'text', 2)).toBe(true);
    expect(editor.getBlocks()[0].data.markdown).toBe('**aXb**');
    expect(host.querySelector('strong')!.firstChild).toBe(textNode);
    expect(reconcileHost(controller, 'a', 'text')).toBe(false);
  });

  it('measures the DOM caret only when the host text differs from the model', () => {
    const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'ab' } }] });
    const controller = new ViewController({ editor });
    const host = document.createElement('div');
    document.body.appendChild(host);
    controller.registry.register('a', 'text', host);
    controller.renderHost('a', 'text');
    const textNode = host.firstChild as Text;
    document.getSelection()!.setBaseAndExtent(textNode, 1, textNode, 1);
    const measure = vi.spyOn(document, 'createRange');
    expect(reconcileHost(controller, 'a', 'text')).toBe(false);
    expect(measure).not.toHaveBeenCalled();
    textNode.data = 'aXb';
    document.getSelection()!.setBaseAndExtent(textNode, 2, textNode, 2);
    expect(reconcileHost(controller, 'a', 'text')).toBe(true);
    expect(measure).toHaveBeenCalled();
    expect(editor.getBlocks()[0].data.markdown).toBe('aXb');
    measure.mockRestore();
  });
});
