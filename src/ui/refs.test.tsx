import * as React from 'react';
import { render } from '@testing-library/react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';

// React 18 attaches a ref to a function component only through forwardRef; a plain
// function drops it, which loses Edit focus return, the drag handle and menu anchoring.
const FORWARD_REF = Symbol.for('react.forward_ref');

describe('primitives that receive a ref', () => {
  it.each([
    ['Button', Button, HTMLButtonElement],
    ['Input', Input, HTMLInputElement],
    ['Textarea', Textarea, HTMLTextAreaElement],
  ] as const)('%s forwards it to its element on every React major', (_name, Component, Element) => {
    const ref = React.createRef<HTMLElement>();
    const Primitive = Component as React.ComponentType<{ ref: React.Ref<HTMLElement> }>;
    render(<Primitive ref={ref} />);

    expect((Component as unknown as { $$typeof?: symbol }).$$typeof).toBe(FORWARD_REF);
    expect(ref.current).toBeInstanceOf(Element);
  });
});
