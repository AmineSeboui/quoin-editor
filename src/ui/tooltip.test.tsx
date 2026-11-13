import { act, render, screen } from '@testing-library/react';
import { Bold } from '../icons';
import { IconButton } from './icon-button';

function focusBold() {
  render(
    <IconButton label="Bold" shortcut="⌘B">
      <Bold />
    </IconButton>,
  );
  const button = screen.getByRole('button', { name: 'Bold' });
  act(() => button.focus());
  return button;
}

describe('an icon button', () => {
  it('shows its name and shortcut in a tooltip on keyboard focus', async () => {
    focusBold();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Bold');
    expect(document.querySelector('[data-slot="tooltip-content"] [data-slot="kbd"]')).toHaveTextContent('⌘B');
  });

  it('adds no accessible description to the button its name already gives', async () => {
    const button = focusBold();
    await screen.findByRole('tooltip');
    expect(button).not.toHaveAttribute('aria-describedby');
  });

  it('portals its tooltip with the quoin class', async () => {
    focusBold();
    await screen.findByRole('tooltip');
    expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveClass('quoin');
  });
});
