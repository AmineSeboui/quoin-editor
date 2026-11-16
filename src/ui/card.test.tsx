import { render, screen } from '@testing-library/react';
import { Card } from './card';

describe("shadcn's Card", () => {
  it('draws a frame forced colours keep, since its ring is a shadow they remove', () => {
    render(<Card data-testid="card" />);
    expect(screen.getByTestId('card')).toHaveClass('ring-1', 'forced-colors:border');
  });
});
