import { DirectionProvider } from '@radix-ui/react-direction';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Kbd } from './kbd';
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

  it('does not open its tooltip once the button is pressed during the hover delay', () => {
    vi.useFakeTimers();
    try {
      render(
        <IconButton label="Drag to move">
          <Bold />
        </IconButton>,
      );
      const button = screen.getByRole('button', { name: 'Drag to move' });
      fireEvent.pointerMove(button, { pointerType: 'mouse' });
      fireEvent.pointerDown(button, { pointerType: 'mouse', button: 2 });
      act(() => void vi.advanceTimersByTime(1000));
      expect(screen.queryByRole('tooltip')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('draws its tooltip in the direction of the editor around it', async () => {
    render(
      <DirectionProvider dir="rtl">
        <IconButton label="Bold" shortcut="⌘B">
          <Bold />
        </IconButton>
      </DirectionProvider>,
    );
    act(() => screen.getByRole('button', { name: 'Bold' }).focus());
    await screen.findByRole('tooltip');
    expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveAttribute('dir', 'rtl');
  });
});

describe('a key chip', () => {
  it('keeps a long key on one line', () => {
    render(<Kbd>Strg+Umschalt+Z oder Strg+Y</Kbd>);
    expect(screen.getByText('Strg+Umschalt+Z oder Strg+Y').className.split(' ')).toContain('whitespace-nowrap');
  });
});
