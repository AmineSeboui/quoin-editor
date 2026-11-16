import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './checkbox';

function Controlled() {
  const [checked, setChecked] = useState(false);
  return <Checkbox aria-label="Decorative" checked={checked} onChange={(event) => setChecked(event.target.checked)} />;
}

describe("shadcn's Checkbox, on a native input", () => {
  it('is a checkbox that a click and Space both toggle', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const box = screen.getByRole('checkbox', { name: 'Decorative' });
    expect(box).toHaveAttribute('data-slot', 'checkbox');
    await user.click(box);
    expect(box).toBeChecked();
    await user.keyboard(' ');
    expect(box).not.toBeChecked();
  });

  it('gives forced colours back the native box, so its state stays visible', () => {
    render(<Checkbox aria-label="Decorative" />);
    expect(screen.getByRole('checkbox').className.split(' ')).toEqual(
      expect.arrayContaining(['appearance-none', 'forced-colors:appearance-auto']),
    );
  });
});
