import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAttrsStep } from '../../engine';
import type { QuoinBlock, UploadFn } from '../../types';
import { mountCanvas, paragraph } from './test-canvas';

const upload: UploadFn = async (file) => ({ storageKey: `key/${file.name}`, filename: file.name, size: file.size });
const emptyImage: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: '', alt: '' } };
const emptyFile: QuoinBlock = { id: 'f', type: 'FILE', data: { storageKey: '', filename: '' } };

function mount() {
  const canvas = mountCanvas([paragraph('a', 'above'), emptyImage, emptyFile], { upload, resolveAssetUrl: (key) => key });
  act(() => {
    const { editor } = canvas.handle().controller;
    editor.dispatch(editor.createTransaction().step(setAttrsStep('i', { alt: 'Edited' })));
  });
  const mod = canvas.handle().controller.isMac ? { metaKey: true } : { ctrlKey: true };
  const alt = () => canvas.last().find(({ id }) => id === 'i')?.data.alt;
  return { ...canvas, mod, alt };
}

describe('the controls of a block with nothing uploaded yet', () => {
  it.each([
    ['image', 'Upload image'],
    ['file', 'Upload file'],
  ])('run undo and redo in the editor from the upload button of a %s, which takes focus back to the selection undo restores', (_, name) => {
    const { mod, alt } = mount();
    const button = screen.getByLabelText(name);
    act(() => button.focus());
    const undo = fireEvent.keyDown(button, { key: 'z', ...mod });
    expect(undo).toBe(false);
    expect(alt()).toBe('');
    expect(screen.getByRole('textbox', { name: 'Paragraph' })).toHaveFocus();
    act(() => button.focus());
    fireEvent.keyDown(button, { key: 'z', shiftKey: true, ...mod });
    expect(alt()).toBe('Edited');
    act(() => button.focus());
    fireEvent.keyDown(button, { key: 'z', ...mod });
    act(() => button.focus());
    fireEvent.keyDown(button, { key: 'y', ...mod });
    expect(alt()).toBe('Edited');
  });

  it('leave a Mod key the editor does not take to the browser', () => {
    const { mod } = mount();
    const button = screen.getByLabelText('Upload image');
    act(() => button.focus());
    expect(fireEvent.keyDown(button, { key: 'c', ...mod })).toBe(true);
    expect(button).toHaveFocus();
  });

  it('leave undo in the link field to the field', async () => {
    const user = userEvent.setup();
    const { mod, alt } = mount();
    await user.click(screen.getByRole('button', { name: 'Embed link' }));
    const field = screen.getByRole('textbox', { name: 'Image link' });
    expect(fireEvent.keyDown(field, { key: 'z', ...mod })).toBe(true);
    expect(alt()).toBe('Edited');
    expect(field).toHaveFocus();
  });
});
