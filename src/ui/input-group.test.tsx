import { fireEvent, render, screen } from '@testing-library/react';
import { ArrowUp, Sparkles } from '../icons';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupTextarea } from './input-group';

const classesOf = (element: Element) => element.className.split(' ');

describe('an input group', () => {
  it('focuses its field when the addon itself is clicked', () => {
    render(
      <InputGroup>
        <InputGroupAddon data-testid="addon">
          <Sparkles />
        </InputGroupAddon>
        <InputGroupInput aria-label="Ask" />
      </InputGroup>,
    );
    fireEvent.click(screen.getByTestId('addon'));
    expect(screen.getByLabelText('Ask')).toHaveFocus();
  });

  it('leaves focus where a button in the addon puts it', () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="Ask" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton aria-label="Send">
            <ArrowUp />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    const send = screen.getByRole('button', { name: 'Send' });
    send.focus();
    fireEvent.click(send);
    expect(send).toHaveFocus();
  });

  it('draws the focus ring on the group, not on its field', () => {
    render(
      <InputGroup data-testid="group">
        <InputGroupInput aria-label="Ask" />
      </InputGroup>,
    );
    expect(classesOf(screen.getByTestId('group'))).toContain('has-[[data-slot=input-group-control]:focus-visible]:ring-3');
    const field = classesOf(screen.getByLabelText('Ask'));
    expect(field).toContain('focus-visible:ring-0');
    expect(field).not.toContain('focus-visible:ring-3');
  });

  it('names its field and textarea as the group control', () => {
    render(
      <InputGroup>
        <InputGroupTextarea aria-label="Next" />
      </InputGroup>,
    );
    expect(screen.getByLabelText('Next')).toHaveAttribute('data-slot', 'input-group-control');
  });

  it('gives a button type button unless told otherwise', () => {
    render(<InputGroupButton aria-label="Send" />);
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'button');
  });
});
