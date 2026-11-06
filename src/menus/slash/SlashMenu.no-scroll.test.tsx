import { act, fireEvent, screen, within } from '@testing-library/react';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

function openCanvas() {
  const canvas = mountCanvas([paragraph('a', '')]);
  act(() => canvas.handle().focus('start'));
  return canvas;
}

const listbox = () => screen.queryByRole('listbox', { name: 'Commands' });
const activeOption = () => within(listbox()!).getByRole('option', { selected: true });

describe('a host whose elements cannot be scrolled', () => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  const absent: Record<string, unknown> = {};

  beforeEach(() => {
    for (const name of ['scrollIntoView', 'scrollTo']) {
      absent[name] = proto[name];
      delete proto[name];
    }
  });

  afterEach(() => {
    for (const [name, value] of Object.entries(absent)) if (value !== undefined) proto[name] = value;
  });

  it('opens the slash menu and walks it, where keeping the entry in view is all that is lost', () => {
    const canvas = openCanvas();
    type('/hea');
    expect(activeOption()).toHaveTextContent('Heading 1');

    const host = canvas.shell('a').querySelector<HTMLElement>('[data-quoin-host]')!;
    fireEvent.keyDown(host, { key: 'ArrowDown' });
    expect(activeOption()).toHaveTextContent('Heading 2');

    fireEvent.keyDown(host, { key: 'Enter' });
    expect(listbox()).toBeNull();
    expect(canvas.last()?.map((block) => block.data.markdown)).toEqual(['## ']);
  });
});
