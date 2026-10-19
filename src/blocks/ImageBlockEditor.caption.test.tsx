import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuoinBlock } from '../types';
import { mountCanvas } from './void/test-canvas';

const image = (caption?: string): QuoinBlock => ({
  id: 'i',
  type: 'IMAGE',
  data: caption === undefined ? { storageKey: 'pic.png', alt: '' } : { storageKey: 'pic.png', alt: 'Old', caption },
});

function openImage(block: QuoinBlock) {
  const canvas = mountCanvas([block]);
  canvas.nodeSelect('i');
  canvas.press('Enter');
  const caption = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Image caption' });
  const alt = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Image alt text' });
  const stored = () => canvas.last()[0].data.caption;
  return { caption, alt, stored };
}

describe('the caption of an image in the canvas', () => {
  it('shows typed text as it was typed and stores it as inline markdown, escaped once', async () => {
    const user = userEvent.setup();
    const { caption, stored } = openImage(image());
    await user.type(caption(), '5 * 3 = [[15]');
    expect(caption()).toHaveValue('5 * 3 = [15]');
    expect(stored()).toBe('5 \\* 3 = \\[15\\]');
  });

  it('shows a 0.4 caption as written, keeps its meaning through other edits and never escapes it twice', async () => {
    const user = userEvent.setup();
    const { caption, alt, stored } = openImage(image('Figure 1 * draft [v2]'));
    expect(caption()).toHaveValue('Figure 1 * draft [v2]');
    await user.type(alt(), '!');
    expect(stored()).toBe('Figure 1 \\* draft \\[v2\\]');
    await user.type(alt(), '?');
    expect(stored()).toBe('Figure 1 \\* draft \\[v2\\]');
    expect(caption()).toHaveValue('Figure 1 * draft [v2]');
    await user.type(caption(), ' ok');
    expect(caption()).toHaveValue('Figure 1 * draft [v2] ok');
    expect(stored()).toBe('Figure 1 \\* draft \\[v2\\] ok');
  });
});
