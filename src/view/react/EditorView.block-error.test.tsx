import { act, render, screen } from '@testing-library/react';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import type { BlockRenderer } from './block-renderer-types';
import { insertText } from '../../engine/commands/insert-text';
import type { ViewController } from '../controller/view-controller';
import { Editor, hostOf, md } from './test-harness';

const Fragile: BlockRenderer = ({ block }) => {
  const { broken, n } = block.attrs.data as { broken: boolean; n: number };
  if (broken) throw new Error('cannot draw');
  return <p>drawn {n}</p>;
};

const fragile = (id: string, broken: boolean, n = 1): QuoinBlock => ({ id, type: 'FRAGILE', data: { broken, n } });

function mount(blocks: QuoinBlock[], view = {}) {
  const ui = render(<Editor options={{ blocks, onChange: () => {} }} view={{ renderers: { FRAGILE: Fragile }, ...view }} />);
  const again = (next: QuoinBlock[]) =>
    ui.rerender(<Editor options={{ blocks: next, onChange: () => {} }} view={{ renderers: { FRAGILE: Fragile }, ...view }} />);
  return { ...ui, again };
}

describe('a renderer that throws while drawing its block', () => {
  let logged: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => logged.mockRestore());

  it('keeps the other blocks editable while the fallback is shown', () => {
    let controller!: ViewController;
    const blocks = [md('a', 'one'), fragile('f', true), md('b', 'two')];
    const { container } = render(
      <Editor
        options={{ blocks, onChange: () => {} }}
        view={{ renderers: { FRAGILE: Fragile } }}
        onController={(created) => (controller = created)}
      />,
    );
    expect(screen.getByRole('group', { name: 'Block could not be drawn' })).toBeInTheDocument();
    act(() => controller.focus({ block: 'b', region: 'text', offset: 3 }));
    act(() => controller.run(insertText('!')));
    expect(hostOf(container, 'b')).toHaveTextContent('two!');
    expect(controller.editor.toMarkdown()).toContain('two!');
  });

  it('draws a named fallback in the shell of its block and leaves the other blocks alone', () => {
    const { container } = mount([md('a', 'one'), fragile('f', true), md('b', 'two')]);
    const shell = container.querySelector('[data-block-id="f"]')!;
    expect(shell.getAttribute('data-type')).toBe('FRAGILE');
    expect(screen.getByRole('group', { name: 'Block could not be drawn' })).toHaveTextContent('Block could not be drawn');
    expect(hostOf(container, 'a')).toHaveTextContent('one');
    expect(hostOf(container, 'b')).toHaveTextContent('two');
  });

  it('takes the name of the fallback from the label the editor is given', () => {
    mount([fragile('f', true)], { blockErrorLabel: 'Bloc illisible' });
    expect(screen.getByRole('group', { name: 'Bloc illisible' })).toBeInTheDocument();
  });

  it('tells the host through onBlockError, with the error that was thrown', () => {
    const onBlockError = vi.fn();
    mount([fragile('f', true)], { onBlockError });
    expect(onBlockError).toHaveBeenCalledTimes(1);
    expect(onBlockError.mock.calls[0][0]).toEqual(new Error('cannot draw'));
  });

  it('draws the block again when its data changes and the throw stops', () => {
    const { again, container } = mount([md('a', 'one'), fragile('f', true)]);
    expect(screen.queryByText('drawn 1')).toBeNull();
    act(() => again([md('a', 'one'), fragile('f', false, 1)]));
    expect(screen.getByText('drawn 1')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Block could not be drawn' })).toBeNull();
    expect(container.querySelector('[data-block-id="f"]')).not.toBeNull();
  });

  it('draws the block again when the host swaps in a renderer that does not throw', () => {
    const blocks = [md('a', 'one'), fragile('f', true, 2)];
    const Fixed: BlockRenderer = ({ block }) => <p>fixed {(block.attrs.data as { n: number }).n}</p>;
    const { rerender } = mount(blocks);
    expect(screen.getByRole('group', { name: 'Block could not be drawn' })).toBeInTheDocument();
    rerender(<Editor options={{ blocks, onChange: () => {} }} view={{ renderers: { FRAGILE: Fixed } }} />);
    expect(screen.getByText('fixed 2')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Block could not be drawn' })).toBeNull();
  });
});
