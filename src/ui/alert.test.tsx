import { render, screen } from '@testing-library/react';
import { CircleAlert } from '../icons';
import { Alert, AlertDescription, AlertTitle } from './alert';

const PHYSICAL = /(^|\s)(text-left|text-right|[mp][lr]-\S+|left-\S+|right-\S+)(\s|$)/;

describe("shadcn's Alert", () => {
  it('announces its title and description together', () => {
    render(
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>AI could not answer</AlertTitle>
        <AlertDescription>The key is missing</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-slot', 'alert');
    expect(alert).toHaveTextContent('AI could not answerThe key is missing');
    expect(alert).toHaveClass('text-destructive');
  });

  it('lays itself out with logical sides only, so a right-to-left canvas mirrors it', () => {
    render(
      <div dir="rtl">
        <Alert>
          <CircleAlert />
          <AlertTitle>Title</AlertTitle>
          <AlertDescription>Body</AlertDescription>
        </Alert>
      </div>,
    );
    for (const part of [screen.getByRole('alert'), screen.getByText('Title'), screen.getByText('Body')]) {
      expect(part.className).not.toMatch(PHYSICAL);
    }
  });
});
