import { fireEvent, render, screen } from '@testing-library/react';
import { CommentAvatar } from './CommentAvatar';

describe('a comment author’s avatar', () => {
  it('shows the picture in shadcn’s Avatar, and the initials once the picture fails to load', () => {
    const { container } = render(<CommentAvatar author={{ name: 'Ada Lovelace', avatarUrl: 'https://example.com/ada.png' }} />);
    const picture = container.querySelector('[data-slot="avatar-image"]')!;
    expect(picture.closest('[data-slot="avatar"]')).toHaveAttribute('data-size', 'sm');
    fireEvent.error(picture);
    expect(screen.getByText('AL')).toHaveAttribute('data-slot', 'avatar-fallback');
    expect(container.querySelector('img')).toBeNull();
  });
});
