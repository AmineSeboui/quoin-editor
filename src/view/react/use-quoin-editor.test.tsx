import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { insertText } from '../../engine/commands/insert-text';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import type { ViewController } from '../controller/view-controller';
import { Editor, hostOf, md } from './test-harness';

const first: QuoinBlock[] = [md('a', 'one'), md('b', 'two')];

function mount(options: Partial<Parameters<typeof Editor>[0]['options']> = {}) {
  const controllers: ViewController[] = [];
  const view = render(
    <Editor options={{ blocks: first, onChange: () => {}, ...options }} onController={(c) => controllers.push(c)} />,
  );
  return { ...view, controllers };
}

describe('useQuoinEditor', () => {
  it('creates the editor and controller once, however often it renders', () => {
    const { rerender, controllers } = mount();
    rerender(<Editor options={{ blocks: first, onChange: () => {} }} onController={(c) => controllers.push(c)} />);
    rerender(<Editor options={{ blocks: first, onChange: () => {} }} onController={(c) => controllers.push(c)} />);
    expect(new Set(controllers).size).toBe(1);
  });

  it('reports changes to the newest onChange without recreating anything', () => {
    const older = vi.fn();
    const newer = vi.fn();
    const { rerender, controllers } = mount({ onChange: older });
    rerender(<Editor options={{ blocks: first, onChange: newer }} onController={(c) => controllers.push(c)} />);
    act(() => controllers[0].run(insertText('x')));
    expect(older).not.toHaveBeenCalled();
    expect(newer).toHaveBeenCalledTimes(1);
    expect(newer.mock.calls[0][0][0].data.markdown).toBe('xone');
  });

  it('passes every transaction to the newest onTransaction', () => {
    const seen = vi.fn();
    const { controllers } = mount({ onTransaction: seen });
    act(() => controllers[0].run(insertText('x')));
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0][0].docChanged).toBe(true);
    expect(seen.mock.calls[0][1]).toBe(controllers[0].editor.state);
  });

  it('loads blocks that did not come from the editor and shows them', () => {
    const { rerender, controllers, container } = mount();
    const foreign = [md('a', 'one'), md('c', 'three **bold**')];
    rerender(<Editor options={{ blocks: foreign, onChange: () => {} }} onController={(c) => controllers.push(c)} />);
    expect(controllers[0].editor.getBlocks().map((block) => block.id)).toEqual(['a', 'c']);
    expect(hostOf(container, 'c').innerHTML).toBe('three <strong>bold</strong>');
    expect(container.querySelector('[data-block-id="b"]')).toBeNull();
  });

  it('ignores the array it emitted when the host hands it back', () => {
    const onChange = vi.fn();
    const { rerender, controllers } = mount({ onChange });
    act(() => controllers[0].run(insertText('x')));
    const emitted = onChange.mock.calls[0][0] as QuoinBlock[];
    onChange.mockClear();
    rerender(<Editor options={{ blocks: emitted, onChange }} onController={(c) => controllers.push(c)} />);
    expect(onChange).not.toHaveBeenCalled();
    expect(controllers[0].editor.getBlocks()).toEqual(emitted);
  });

  it('follows readOnly in both directions', () => {
    const { rerender, controllers, container } = mount({ readOnly: true });
    expect(hostOf(container, 'a')).toHaveAttribute('contenteditable', 'false');
    expect(controllers[0].readOnly).toBe(true);
    rerender(<Editor options={{ blocks: first, onChange: () => {}, readOnly: false }} />);
    expect(controllers[0].readOnly).toBe(false);
    expect(hostOf(container, 'a').contentEditable).toBe('true');
  });

  it('detaches the controller when the component unmounts', () => {
    const { unmount, controllers } = mount();
    expect(controllers[0].root).not.toBeNull();
    unmount();
    expect(controllers[0].root).toBeNull();
  });

  it('keeps working under StrictMode, which mounts, unmounts and mounts again', () => {
    const onChange = vi.fn();
    const controllers: ViewController[] = [];
    const { container } = render(
      <StrictMode>
        <Editor options={{ blocks: first, onChange }} onController={(c) => controllers.push(c)} />
      </StrictMode>,
    );
    const controller = controllers[controllers.length - 1];
    expect(controller.root).not.toBeNull();
    act(() => controller.run(insertText('x')));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(hostOf(container, 'a').textContent).toBe('xone');
  });
});
