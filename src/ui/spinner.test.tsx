import { render } from '@testing-library/react';
import { Spinner } from './spinner';

describe("shadcn's Spinner", () => {
  it('turns, hidden from assistive technology, since the words around it say what is happening', () => {
    const { container } = render(<Spinner />);
    const spinner = container.querySelector('[data-slot="spinner"]')!;
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
    expect(spinner).not.toHaveAttribute('role');
    expect(spinner).toHaveClass('animate-spin', 'motion-reduce:animate-none');
  });
});
