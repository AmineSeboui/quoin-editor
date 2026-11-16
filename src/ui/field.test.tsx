import { render, screen } from '@testing-library/react';
import { Field, FieldDescription, FieldError, FieldLabel } from './field';
import { Input } from './input';

describe("shadcn's Field", () => {
  it('names its control with a visible label and describes it', () => {
    render(
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" aria-describedby="hint" />
        <FieldDescription id="hint">Your full name</FieldDescription>
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Your full name');
    expect(screen.getByText('Name')).toHaveAttribute('data-slot', 'field-label');
  });

  it('lays its parts out in a column unless asked for a row', () => {
    render(
      <>
        <Field data-testid="column" />
        <Field data-testid="row" orientation="horizontal" />
      </>,
    );
    expect(screen.getByTestId('column')).toHaveAttribute('data-orientation', 'vertical');
    expect(screen.getByTestId('row')).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('announces an error and draws nothing without one', () => {
    const { rerender } = render(<FieldError>Enter a valid link</FieldError>);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid link');
    rerender(<FieldError />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
