import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { ViewController } from '../controller/view-controller';
import { hostOf, Stateful } from './test-harness';

function mount() {
  let controller!: ViewController;
  const onChange = vi.fn();
  const { container } = render(<Stateful blocks={[]} options={{ onChange }} onController={(c) => (controller = c)} />);
  const host = screen.getByRole('textbox', { name: 'Paragraph' });
  act(() => host.focus());
  document.getSelection()!.collapse(host, 0);
  const markdown = () => controller.editor.getBlocks().map((block) => block.data.markdown);
  const paragraph = () => hostOf(container, controller.editor.state.doc.blocks[0].id);
  return { controller: () => controller, host, onChange, markdown, paragraph };
}

function write(host: HTMLElement, text: string): void {
  host.textContent = text;
  if (host.firstChild) document.getSelection()!.collapse(host.firstChild, text.length);
}

const fire = (target: Element, event: Event) => act(() => void target.dispatchEvent(event));
const composition = (type: string, data = '') => new CompositionEvent(type, { data, bubbles: true });
const input = (inputType: string, isComposing = false) => new InputEvent('input', { inputType, isComposing, bubbles: true });
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

describe('EmptyDocumentHost compositions', () => {
  it('commits a composition as the first paragraph once it settles, with the caret after it', async () => {
    const { controller, host, onChange, markdown, paragraph } = mount();
    fire(host, composition('compositionstart'));
    expect(controller().composingKey).not.toBeNull();
    write(host, '日本');
    fire(host, composition('compositionend', '日本'));
    expect(markdown()).toEqual([]);
    await settle();
    expect(markdown()).toEqual(['日本']);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(controller().composingKey).toBeNull();
    expect(document.activeElement).toBe(paragraph());
    expect(controller().editor.state.selection).toMatchObject({ head: { offset: 2 } });
    expect(document.getSelection()).toMatchObject({ anchorNode: paragraph().firstChild, anchorOffset: 2 });
  });

  it('commits once on the input event that follows compositionend', () => {
    const { host, onChange, markdown } = mount();
    fire(host, composition('compositionstart'));
    write(host, 'é');
    fire(host, composition('compositionend', 'é'));
    fire(host, input('insertFromComposition'));
    expect(markdown()).toEqual(['é']);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('leaves the composing host alone, even for input that does not say it is composing', async () => {
    const { host, markdown } = mount();
    fire(host, composition('compositionstart'));
    write(host, 'にほ');
    fire(host, input('insertCompositionText', true));
    fire(host, input('insertText'));
    expect(markdown()).toEqual([]);
    expect(host.textContent).toBe('にほ');
    fire(host, composition('compositionend', 'にほ'));
    await settle();
    expect(markdown()).toEqual(['にほ']);
  });

  it('puts the placeholder back when a composition is cancelled', async () => {
    const { host, onChange, markdown } = mount();
    fire(host, composition('compositionstart'));
    host.replaceChildren();
    fire(host, composition('compositionend'));
    await settle();
    expect(markdown()).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
    expect(host.innerHTML).toBe('<br data-quoin-filler="">');
  });
});

describe('EmptyDocumentHost input the editor did not handle', () => {
  it('becomes the first paragraph through insertText, so input rules apply', () => {
    const { host, onChange, markdown, paragraph } = mount();
    write(host, '**ab**');
    fire(host, input('insertReplacementText'));
    expect(markdown()).toEqual(['**ab**']);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(paragraph());
  });

  it('is left alone while read-only', () => {
    const { controller, host, markdown } = mount();
    act(() => controller().setReadOnly(true));
    write(host, 'translated');
    fire(host, input('insertReplacementText'));
    expect(markdown()).toEqual([]);
  });
});
