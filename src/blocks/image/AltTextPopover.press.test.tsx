import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuoinBlock } from '../../types';
import { intrinsicSize } from '../intrinsic-size';
import { mountCanvas, paragraph } from '../void/test-canvas';

vi.mock('../intrinsic-size');

const image: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: 'cat.png', alt: 'A cat' } };
const button = (name: string) => within(screen.getByRole('toolbar', { name: 'Image tools' })).getByRole('button', { name });
const field = () => screen.queryByRole('textbox', { name: 'Alt text' });

function pointer(target: Element, type: string, pointerType: string) {
  const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { pointerType, button: 0 });
  act(() => void target.dispatchEvent(event));
}

beforeEach(() => {
  vi.mocked(intrinsicSize).mockResolvedValue(null);
});

async function editAlt(typed: string) {
  const user = userEvent.setup();
  const canvas = mountCanvas([paragraph('a', 'above'), image, paragraph('b', 'below')], {
    resolveAssetUrl: (key) => `/cdn/${key}`,
  });
  canvas.nodeSelect('i');
  await user.click(button('Alt text'));
  await user.type(field()!, typed);
  const alt = () => canvas.last()?.find((block) => block.id === 'i')?.data.alt;
  const below = canvas.shell('b').querySelector('[data-quoin-host]')!;
  return { ...canvas, user, alt, below };
}

describe('the alt text of an image, when something outside it is pressed', () => {
  it('is stored as soon as a mouse press lands, before any click, and a press on the toolbar keeps the image', async () => {
    const { alt, sink } = await editAlt(' asleep');
    pointer(button('Align center'), 'pointerdown', 'mouse');
    expect(alt()).toBe('A cat asleep');
    expect(field()).toBeNull();
    expect(sink()).toHaveFocus();
  });

  it('stays open with what was typed through a touch scroll that starts outside it', async () => {
    const { alt, below } = await editAlt(' asleep');
    pointer(below, 'pointerdown', 'touch');
    pointer(below, 'pointercancel', 'touch');
    expect(field()).toHaveValue('A cat asleep');
    expect(alt()).toBeUndefined();
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Save' })));
    expect(alt()).toBe('A cat asleep');
  });

  it('is stored by a tap outside it once the tap ends in a click, and only then', async () => {
    const { alt, below } = await editAlt(' asleep');
    pointer(below, 'pointerdown', 'touch');
    expect(field()).toHaveValue('A cat asleep');
    act(() => void fireEvent.click(below));
    expect(alt()).toBe('A cat asleep');
    expect(field()).toBeNull();
  });
});
