import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { toHTML } from '../../engine';
import { QuoinView } from '../../view-static/QuoinView';
import type { QuoinBlock } from '../../types';
import { mountCanvas } from '../void/test-canvas';

const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const image = (data: Record<string, unknown> = {}): QuoinBlock => ({
  id: 'i',
  type: 'IMAGE',
  data: { storageKey: 'cat.png', alt: '', ...data },
});
const badge = () => screen.queryByRole('button', { name: 'No alt text' });

describe('the no alt text badge of an image', () => {
  it('is drawn on an editable canvas over an image with an empty alt text that is not decorative', () => {
    mountCanvas([image()], { resolveAssetUrl });
    expect(badge()).not.toBeNull();
  });

  it.each([
    ['has alt text', { alt: 'A cat' }],
    ['is decorative', { decorative: true }],
  ])('is not drawn on an image that %s', (_, data) => {
    mountCanvas([image(data)], { resolveAssetUrl });
    expect(badge()).toBeNull();
  });

  it('is not drawn on a read-only canvas', () => {
    mountCanvas([image()], { resolveAssetUrl, readOnly: true });
    expect(badge()).toBeNull();
  });

  it('is not drawn by toHTML, which writes an empty alt for it as for a decorative image', () => {
    expect(toHTML([image()], { resolveAssetUrl })).not.toContain('No alt text');
    for (const block of [image(), image({ decorative: true })]) {
      expect(toHTML([block], { resolveAssetUrl })).toContain('alt=""');
    }
  });

  it('is not drawn by QuoinView', () => {
    expect(renderToString(<QuoinView blocks={[image()]} resolveAssetUrl={resolveAssetUrl} />)).not.toContain('No alt text');
  });

  it('opens the alt text popover on the image, and goes once alt text is saved', async () => {
    const user = userEvent.setup();
    const { handle } = mountCanvas([image()], { resolveAssetUrl });
    await user.click(badge()!);
    await user.type(screen.getByRole('textbox', { name: 'Alt text' }), 'A cat');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(handle().editor.getBlocks()[0].data.alt).toBe('A cat');
    expect(badge()).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Alt text' })).toBeNull();
  });

  it('goes when the image is marked decorative from the popover', async () => {
    const user = userEvent.setup();
    const { handle } = mountCanvas([image()], { resolveAssetUrl });
    await user.click(badge()!);
    await user.click(screen.getByRole('checkbox', { name: 'Decorative image' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(handle().editor.getBlocks()[0].data.decorative).toBe(true);
    expect(badge()).toBeNull();
  });
});
