import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinBlock } from '../../types';
import { md } from '../../view/react/test-harness';
import { mountCanvas } from '../void/test-canvas';

const closed: QuoinBlock[] = [
  { id: 't', type: 'TOGGLE', data: { markdown: 'Summary', open: false } },
  md('c', 'child', 1),
  md('g', 'grandchild', 2),
  md('s', 'sibling'),
];

const chevron = () => screen.getByRole('button', { name: /^Toggle/ });

describe('a toggle in a read-only canvas', () => {
  it('opens and closes for the reader from its chevron, without changing the document', () => {
    const { shell, changes } = mountCanvas(closed, { readOnly: true });
    expect(chevron()).toHaveAccessibleName('Toggle, 2 blocks hidden');
    act(() => chevron().click());
    expect(chevron()).toHaveAttribute('aria-expanded', 'true');
    expect(chevron()).toHaveAccessibleName('Toggle');
    expect(shell('t').querySelector('.quoin-toggle')).toHaveAttribute('data-open', 'true');
    expect(shell('c')).toHaveTextContent('child');
    expect(shell('g')).toHaveTextContent('grandchild');
    act(() => chevron().click());
    expect(chevron()).toHaveAttribute('aria-expanded', 'false');
    expect(shell('c')).toBeNull();
    expect(changes).toEqual([]);
  });

  it('closes an open toggle for the reader the same way', () => {
    const { shell, changes } = mountCanvas([{ ...closed[0], data: { markdown: 'Summary', open: true } }, md('c', 'child', 1)], {
      readOnly: true,
    });
    act(() => chevron().click());
    expect(shell('c')).toBeNull();
    expect(changes).toEqual([]);
  });

  it('is a tab stop of its own for a reader', () => {
    mountCanvas(closed, { readOnly: true });
    expect(chevron()).toHaveAttribute('tabindex', '0');
  });

  it('is out of the tab order while the canvas is edited', () => {
    mountCanvas(closed);
    expect(chevron()).toHaveAttribute('tabindex', '-1');
  });

  it('opens for the reader from Mod+Enter in its text, says so and leaves the document alone', () => {
    const { shell, handle, changes } = mountCanvas(closed, { readOnly: true });
    act(() => handle().focus({ block: 't', region: 'text', offset: 2 }));
    const { isMac } = handle().controller;
    act(() => void fireEvent.keyDown(document.activeElement!, { key: 'Enter', ctrlKey: !isMac, metaKey: isMac }));
    expect(chevron()).toHaveAttribute('aria-expanded', 'true');
    expect(shell('c')).toHaveTextContent('child');
    expect(screen.getByRole('status')).toHaveTextContent('expanded');
    expect(changes).toEqual([]);
  });

  it('draws as the document says again once the canvas can be edited', () => {
    let setReadOnly: (readOnly: boolean) => void = () => {};
    function Host() {
      const [readOnly, set] = useState(true);
      setReadOnly = set;
      return <BlockCanvas blocks={closed} onChange={() => {}} readOnly={readOnly} />;
    }
    const { container } = render(<Host />);
    act(() => chevron().click());
    expect(container.querySelector('[data-block-id="c"]')).not.toBeNull();
    act(() => setReadOnly(false));
    expect(chevron()).toHaveAttribute('aria-expanded', 'false');
    expect(container.querySelector('[data-block-id="c"]')).toBeNull();
  });
});
