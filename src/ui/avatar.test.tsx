import { render, screen } from '@testing-library/react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

describe("shadcn's Avatar", () => {
  it('draws a picture or initials in a circle of the size asked for', () => {
    render(
      <>
        <Avatar size="sm" data-testid="picture">
          <AvatarImage src="https://example.com/a.png" alt="" />
        </Avatar>
        <Avatar data-testid="initials">
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
      </>,
    );
    expect(screen.getByTestId('picture')).toHaveAttribute('data-size', 'sm');
    expect(screen.getByTestId('picture').querySelector('img')).toHaveAttribute('data-slot', 'avatar-image');
    expect(screen.getByTestId('initials')).toHaveAttribute('data-size', 'default');
    expect(screen.getByText('AL')).toHaveAttribute('data-slot', 'avatar-fallback');
  });
});
