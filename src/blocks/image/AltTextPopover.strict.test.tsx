import { StrictMode, createRef, useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import { nodeSelection } from '../../engine';
import type { QuoinBlock } from '../../types';

const blocks: QuoinBlock[] = [
  { id: 'a', type: 'MARKDOWN', data: { markdown: 'above' } },
  { id: 'i', type: 'IMAGE', data: { storageKey: 'cat.png', alt: 'A cat' } },
];

function mountStrict() {
  const changes: QuoinBlock[][] = [];
  const ref = createRef<QuoinEditorHandle>();
  function Host() {
    const [doc, setDoc] = useState(blocks);
    const onChange = (next: QuoinBlock[]) => {
      changes.push(next);
      setDoc(next);
    };
    return <BlockCanvas ref={ref} blocks={doc} resolveAssetUrl={(key) => `/cdn/${key}`} onChange={onChange} />;
  }
  render(
    <StrictMode>
      <Host />
    </StrictMode>,
  );
  act(() => {
    const { controller } = ref.current!;
    controller.dispatch(controller.editor.createTransaction().setSelection(nodeSelection('i')));
    ref.current!.focus();
  });
  return { alt: () => changes.at(-1)?.[1].data.alt };
}

const openAlt = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(within(screen.getByRole('toolbar', { name: 'Image tools' })).getByRole('button', { name: 'Alt text' }));

describe('the alt text of an image under StrictMode', () => {
  it('is stored on Enter, which closes it', async () => {
    const user = userEvent.setup();
    const { alt } = mountStrict();
    await openAlt(user);
    await user.type(screen.getByRole('textbox', { name: 'Alt text' }), ' asleep{Enter}');
    expect(alt()).toBe('A cat asleep');
    expect(screen.queryByRole('textbox', { name: 'Alt text' })).toBeNull();
  });

  it('is left as it was on Escape, which closes it', async () => {
    const user = userEvent.setup();
    const { alt } = mountStrict();
    await openAlt(user);
    await user.type(screen.getByRole('textbox', { name: 'Alt text' }), ' asleep');
    await user.keyboard('{Escape}');
    expect(alt()).toBeUndefined();
    expect(screen.queryByRole('textbox', { name: 'Alt text' })).toBeNull();
  });
});
