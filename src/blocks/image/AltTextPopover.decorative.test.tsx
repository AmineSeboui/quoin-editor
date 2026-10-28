import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuoinBlock } from '../../types';
import { intrinsicSize } from '../intrinsic-size';
import { mountCanvas, paragraph } from '../void/test-canvas';

vi.mock('../intrinsic-size');

const image = (data: Record<string, unknown> = {}): QuoinBlock => ({
  id: 'i',
  type: 'IMAGE',
  data: { storageKey: 'cat.png', alt: 'A cat', ...data },
});
const field = () => screen.getByRole('textbox', { name: 'Alt text' });
const box = () => screen.getByRole('checkbox', { name: 'Decorative image' });

beforeEach(() => {
  vi.mocked(intrinsicSize).mockResolvedValue(null);
});

async function open(block: QuoinBlock) {
  const user = userEvent.setup();
  const canvas = mountCanvas([block, paragraph('b', 'below')], { resolveAssetUrl: (key) => `/cdn/${key}` });
  canvas.nodeSelect('i');
  await user.click(within(screen.getByRole('toolbar', { name: 'Image tools' })).getByRole('button', { name: 'Alt text' }));
  const data = () => canvas.handle().editor.getBlocks()[0].data;
  return { ...canvas, user, data };
}

describe('the decorative image checkbox of the alt text popover', () => {
  it('is unchecked for an image with alt text, and checked, with the field not required, for a decorative one', async () => {
    await open(image());
    expect(box()).not.toBeChecked();
    expect(field()).toBeRequired();
    cleanup();
    await open(image({ alt: '', decorative: true }));
    expect(box()).toBeChecked();
    expect(field()).not.toBeRequired();
  });

  it('stores decorative with no alt text on Save, clearing what was there', async () => {
    const { user, data } = await open(image());
    await user.click(box());
    expect(field()).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(data()).toEqual({ storageKey: 'cat.png', alt: '', decorative: true });
  });

  it('unchecks as alt text is typed, and stores the alt text without the flag', async () => {
    const { user, data } = await open(image({ alt: '', decorative: true }));
    await user.type(field(), 'A dog');
    expect(box()).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(data()).toEqual({ storageKey: 'cat.png', alt: 'A dog' });
  });

  it('writes nothing when it is left as it was, and leaves a decorative image decorative on Escape', async () => {
    const { user, data, changes } = await open(image({ alt: '', decorative: true }));
    await user.click(box());
    await user.keyboard('{Escape}');
    expect(data()).toEqual({ storageKey: 'cat.png', alt: '', decorative: true });
    expect(changes).toEqual([]);
  });

  it('is reached by Tab between the field and Save, and Tab out of Save stores it', async () => {
    const { user, data } = await open(image());
    await user.click(field());
    await user.tab();
    expect(box()).toHaveFocus();
    await user.keyboard(' ');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(box()).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(data()).toEqual({ storageKey: 'cat.png', alt: '', decorative: true });
  });

  it('does not call the alt text required while the image is marked decorative', async () => {
    const { user } = await open(image());
    expect(field()).toHaveAccessibleDescription(expect.stringContaining('Required'));
    await user.click(box());
    expect(field()).not.toHaveAccessibleDescription(expect.stringContaining('Required'));
    expect(screen.getByText(/Required/)).toHaveClass('invisible');
  });

  it('keeps a decorative flag the host set while it was open, storing nothing over it', async () => {
    const { user, data, changes, handle } = await open(image({ alt: '' }));
    await user.type(field(), 'Mine');
    act(() => void handle().editor.setBlocks([image({ alt: '', decorative: true }), paragraph('b', 'below')]));
    await user.keyboard('{Enter}');
    expect(data()).toEqual({ storageKey: 'cat.png', alt: '', decorative: true });
    expect(changes).toEqual([]);
  });
});
