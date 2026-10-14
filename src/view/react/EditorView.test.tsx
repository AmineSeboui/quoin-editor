import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { useState } from 'react';
import type { Selection } from '../../engine';
import { blockRangeSelection, nodeSelection } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { EditorView } from './EditorView';
import { useQuoinEditor } from './use-quoin-editor';
import type { QuoinBlock } from '../../engine/model/quoin-block';

type HarnessProps = {
  initial: QuoinBlock[];
  onBlocks?: (b: QuoinBlock[]) => void;
  onController?: (controller: ViewController) => void;
};

function Harness({ initial, onBlocks, onController }: HarnessProps) {
  const [blocks, setBlocks] = useState(initial);
  const controller = useQuoinEditor({ blocks, onChange: (next) => { setBlocks(next); onBlocks?.(next); } });
  onController?.(controller);
  return <EditorView controller={controller} aria-label="Doc" />;
}

const doc: QuoinBlock[] = [
  { id: 'h', type: 'MARKDOWN', data: { markdown: '## Title **x**' } },
  { id: 't', type: 'MARKDOWN', data: { markdown: '- [ ] task' } },
  { id: 'd', type: 'DIVIDER', data: {} },
];

describe('EditorView', () => {
  it('renders hosts with their kind and formatted content', () => {
    render(<Harness initial={doc} />);
    const heading = screen.getByRole('textbox', { name: 'Heading 2' });
    expect(heading.innerHTML).toBe('Title <strong>x</strong>');
    expect(screen.getByRole('checkbox', { name: 'Task' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('group', { name: 'Doc' })).toBeInTheDocument();
  });

  it('toggles a task through the checkbox and reports the change', () => {
    let latest: QuoinBlock[] = [];
    render(<Harness initial={doc} onBlocks={(b) => (latest = b)} />);
    act(() => screen.getByRole('checkbox', { name: 'Task' }).click());
    expect(latest[1].data.markdown).toBe('- [x] task');
  });

  it('has no axe violations', async () => {
    const { container } = render(<Harness initial={doc} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with a block range or a node selected', async () => {
    let controller!: ViewController;
    const { container } = render(<Harness initial={doc} onController={(c) => (controller = c)} />);
    const select = (selection: Selection) =>
      act(() => controller.dispatch(controller.editor.createTransaction().setSelection(selection)));
    const selected = () => Array.from(container.querySelectorAll<HTMLElement>('[data-selected="true"]'), (shell) => shell.dataset.blockId);
    select(blockRangeSelection('h', 'd'));
    expect(await axe(container)).toHaveNoViolations();
    expect(selected()).toEqual(['h', 't', 'd']);
    select(nodeSelection('d'));
    expect(await axe(container)).toHaveNoViolations();
    expect(selected()).toEqual(['d']);
  });
});
