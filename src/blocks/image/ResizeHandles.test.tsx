import { act, fireEvent, screen } from '@testing-library/react';
import { undo } from '../../engine';
import type { QuoinBlock } from '../../types';
import { mountCanvas } from '../void/test-canvas';
import { keyedWidth, snapWidth } from './resize-width';

const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const image = (data: Record<string, unknown> = {}): QuoinBlock => ({
  id: 'i',
  type: 'IMAGE',
  data: { storageKey: 'cat.png', alt: 'A cat', ...data },
});

describe('the width of a picture', () => {
  it('snaps to 5 percent steps between 10 and 100 percent of the block', () => {
    expect([snapWidth(47), snapWidth(48), snapWidth(3), snapWidth(140)]).toEqual([45, 50, 10, 100]);
    expect([keyedWidth('ArrowRight', 50), keyedWidth('ArrowUp', 50)]).toEqual([55, 55]);
    expect([keyedWidth('ArrowLeft', 50), keyedWidth('ArrowDown', 50)]).toEqual([45, 45]);
    expect([keyedWidth('Home', 50), keyedWidth('End', 50), keyedWidth('ArrowRight', 100)]).toEqual([10, 100, 100]);
    expect(keyedWidth('a', 50)).toBeNull();
  });
});

// jsdom has no PointerEvent, and React hears a pointer event by its type whatever its class.
const pointer = (target: Element, type: string, clientX: number) =>
  act(() => void target.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, clientX })));

describe('the width handles of a picture', () => {
  it('are a slider on each side, from 10 to 100 percent, at the width the block keeps', () => {
    mountCanvas([image({ widthPercent: 60 })], { resolveAssetUrl });
    const handles = screen.getAllByRole('slider', { name: 'Image width' });
    expect(handles).toHaveLength(2);
    for (const handle of handles) {
      expect(handle).toHaveAttribute('aria-valuenow', '60');
      expect(handle).toHaveAttribute('aria-valuemin', '10');
      expect(handle).toHaveAttribute('aria-valuemax', '100');
    }
  });

  it('step the width by 5 percent with the arrows and to its ends with Home and End, one undo step each', () => {
    const { handle, last } = mountCanvas([image({ widthPercent: 60 })], { resolveAssetUrl });
    const [, end] = screen.getAllByRole('slider', { name: 'Image width' });
    act(() => end.focus());
    fireEvent.keyDown(end, { key: 'ArrowRight' });
    expect(last()[0].data.widthPercent).toBe(65);
    fireEvent.keyDown(end, { key: 'ArrowLeft' });
    fireEvent.keyDown(end, { key: 'ArrowLeft' });
    expect(last()[0].data.widthPercent).toBe(55);
    fireEvent.keyDown(end, { key: 'End' });
    expect(last()[0].data.widthPercent).toBe(100);
    expect(end).toHaveAttribute('aria-valuenow', '100');
    fireEvent.keyDown(end, { key: 'Home' });
    expect(last()[0].data).toEqual({ storageKey: 'cat.png', alt: 'A cat', widthPercent: 10 });
    expect(end).toHaveFocus();
    act(() => void handle().controller.run(undo));
    expect(last()[0].data.widthPercent).toBe(100);
  });

  it('start from the width the picture is drawn at when the block keeps none', () => {
    const { container, last } = mountCanvas([image()], { resolveAssetUrl });
    const frame = container.querySelector<HTMLElement>('.quoin-image-frame')!;
    vi.spyOn(frame, 'offsetWidth', 'get').mockReturnValue(300);
    vi.spyOn(frame.parentElement!, 'clientWidth', 'get').mockReturnValue(600);
    const [start] = screen.getAllByRole('slider', { name: 'Image width' });
    act(() => start.focus());
    expect(start).toHaveAttribute('aria-valuenow', '50');
    fireEvent.keyDown(start, { key: 'ArrowRight' });
    expect(last()[0].data.widthPercent).toBe(55);
  });

  it('leave the width to a drag until it ends, then write it once', () => {
    const { container, changes, last } = mountCanvas([image({ widthPercent: 50 })], { resolveAssetUrl });
    const frame = container.querySelector<HTMLElement>('.quoin-image-frame')!;
    vi.spyOn(frame, 'offsetWidth', 'get').mockReturnValue(300);
    vi.spyOn(frame.parentElement!, 'clientWidth', 'get').mockReturnValue(600);
    const [, end] = screen.getAllByRole('slider', { name: 'Image width' });
    pointer(end, 'pointerdown', 400);
    pointer(end, 'pointermove', 460);
    expect(frame.style.width).toBe('60%');
    pointer(end, 'pointermove', 520);
    expect(frame.style.width).toBe('70%');
    expect(changes).toEqual([]);
    pointer(end, 'pointerup', 520);
    expect(changes).toHaveLength(1);
    expect(last()[0].data.widthPercent).toBe(70);
  });

  it('grow a centred picture on both sides, so a drag counts twice', () => {
    const { container, last } = mountCanvas([image({ widthPercent: 50, align: 'center' })], { resolveAssetUrl });
    const frame = container.querySelector<HTMLElement>('.quoin-image-frame')!;
    vi.spyOn(frame, 'offsetWidth', 'get').mockReturnValue(300);
    vi.spyOn(frame.parentElement!, 'clientWidth', 'get').mockReturnValue(600);
    const [start] = screen.getAllByRole('slider', { name: 'Image width' });
    pointer(start, 'pointerdown', 150);
    pointer(start, 'pointermove', 120);
    pointer(start, 'pointerup', 120);
    expect(last()[0].data.widthPercent).toBe(60);
  });
});
