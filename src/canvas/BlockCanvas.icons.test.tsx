import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockCanvas } from './BlockCanvas';
import type { QuoinBlock } from '../types';

const blocks: QuoinBlock[] = [
  { id: 'a', type: 'MARKDOWN', data: { markdown: 'first' } },
  { id: 'b', type: 'CODE', data: { code: 'x = 1' } },
];

const icons = () => [...document.body.querySelectorAll('svg.lucide')];
const exposed = () => icons().filter((icon) => icon.getAttribute('aria-hidden') !== 'true');

describe('BlockCanvas icons', () => {
  it('hides the icons of the canvas from assistive technology', () => {
    render(<BlockCanvas blocks={blocks} onChange={() => {}} />);
    expect(icons().length).toBeGreaterThan(0);
    expect(exposed()).toEqual([]);
  });

  it('hides the icons of the block options menu', async () => {
    const user = userEvent.setup();
    render(<BlockCanvas blocks={blocks} onChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: /block 1 options/i }));
    await screen.findByRole('menuitem', { name: 'Delete block 1' });
    expect(icons().length).toBeGreaterThan(0);
    expect(exposed()).toEqual([]);
  });

  it('hides the icons of the inserter', async () => {
    const user = userEvent.setup();
    render(<BlockCanvas blocks={blocks} onChange={() => {}} />);
    await user.click(screen.getAllByRole('button', { name: /insert a block/i })[0]);
    await screen.findByText('Markdown');
    expect(icons().length).toBeGreaterThan(0);
    expect(exposed()).toEqual([]);
  });
});
