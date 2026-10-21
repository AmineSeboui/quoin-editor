import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuoinBlock } from '../../types';
import { intrinsicSize } from '../intrinsic-size';
import { mountCanvas, paragraph } from '../void/test-canvas';

vi.mock('../intrinsic-size');

const image = (alt: string): QuoinBlock => ({ id: 'i', type: 'IMAGE', data: { storageKey: 'cat.png', alt } });
const field = () => screen.queryByRole('textbox', { name: 'Alt text' });

beforeEach(() => {
  vi.mocked(intrinsicSize).mockResolvedValue(null);
});

describe('the alt text of an image, when the host changes it under the popover', () => {
  it.each(['', ' asleep'])('closes and writes nothing, with %j typed', async (typed) => {
    const user = userEvent.setup();
    const canvas = mountCanvas([image('A cat'), paragraph('b', 'below')], { resolveAssetUrl: (key) => `/cdn/${key}` });
    canvas.nodeSelect('i');
    await user.click(within(screen.getByRole('toolbar', { name: 'Image tools' })).getByRole('button', { name: 'Alt text' }));
    if (typed !== '') await user.type(field()!, typed);
    act(() => void canvas.handle().editor.setBlocks([image('A dog'), paragraph('b', 'below')]));
    expect(field()).toBeNull();
    await user.click(canvas.shell('b').querySelector('[data-quoin-host]')!);
    expect(canvas.handle().editor.getBlocks()[0].data.alt).toBe('A dog');
    expect(canvas.changes).toEqual([]);
    cleanup();
  });
});
