import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilePickerButton } from './FilePickerButton';
import { dropFocusLikeABrowser } from './test-focus';

const png = () => new File(['x'], 'a.png', { type: 'image/png' });

describe('FilePickerButton', () => {
  it('clears the input after a pick so the same file can be chosen again', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<FilePickerButton label="Pick" onPick={onPick} />);
    const input = screen.getByLabelText('Pick') as HTMLInputElement;
    const file = png();
    await user.upload(input, file);
    expect(onPick).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  describe('while busy', () => {
    it('keeps focus on the input and says it is unavailable', async () => {
      const user = userEvent.setup();
      const view = render(<FilePickerButton label="Pick" onPick={vi.fn()} />);
      await user.upload(screen.getByLabelText('Pick'), png());
      view.rerender(<FilePickerButton label="Pick" onPick={vi.fn()} busy />);
      const input = screen.getByLabelText('Pick');
      expect(input).toHaveFocus();
      expect(input).toBeEnabled();
      expect(input).toHaveAttribute('aria-disabled', 'true');
    });

    it('opens no file dialog and takes no file', () => {
      const onPick = vi.fn();
      render(<FilePickerButton label="Pick" onPick={onPick} busy />);
      const input = screen.getByLabelText('Pick');
      expect(fireEvent.click(input)).toBe(false);
      fireEvent.change(input, { target: { files: [png()] } });
      expect(onPick).not.toHaveBeenCalled();
    });
  });

  describe('focus', () => {
    it('stays on the input after a file is picked', async () => {
      const user = userEvent.setup();
      render(<FilePickerButton label="Pick" onPick={vi.fn()} />);
      await user.upload(screen.getByLabelText('Pick'), png());
      expect(screen.getByLabelText('Pick')).toHaveFocus();
    });

    it('is not a pick when the dialog is cancelled, so enabling the input later takes no focus back', () => {
      const onPick = vi.fn();
      const view = render(<FilePickerButton label="Pick" onPick={onPick} />);
      const input = screen.getByLabelText('Pick') as HTMLInputElement;
      input.focus();
      fireEvent(input, new Event('cancel'));
      fireEvent.change(input, { target: { files: [] } });
      view.rerender(<FilePickerButton label="Pick" onPick={onPick} disabled />);
      dropFocusLikeABrowser(input);
      view.rerender(<FilePickerButton label="Pick" onPick={onPick} />);
      expect(onPick).not.toHaveBeenCalled();
      expect(input).not.toHaveFocus();
    });

    describe('when a pick disables the input and a browser drops focus to the body', () => {
      const pickAndDisable = async () => {
        const user = userEvent.setup();
        const view = render(
          <>
            <FilePickerButton label="Pick" onPick={vi.fn()} />
            <button type="button">Elsewhere</button>
          </>,
        );
        const again = (disabled: boolean) =>
          view.rerender(
            <>
              <FilePickerButton label="Pick" onPick={vi.fn()} disabled={disabled} />
              <button type="button">Elsewhere</button>
            </>,
          );
        await user.upload(screen.getByLabelText('Pick'), png());
        again(true);
        dropFocusLikeABrowser(screen.getByLabelText('Pick') as HTMLInputElement);
        return again;
      };

      it('gives focus back to the input once it is enabled again', async () => {
        const again = await pickAndDisable();
        again(false);
        expect(screen.getByLabelText('Pick')).toHaveFocus();
      });

      it('leaves focus where the user moved it meanwhile', async () => {
        const again = await pickAndDisable();
        screen.getByRole('button', { name: 'Elsewhere' }).focus();
        again(false);
        expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
      });
    });

    it('does not take focus when it is enabled without a pick behind it', () => {
      const view = render(<FilePickerButton label="Pick" onPick={vi.fn()} disabled />);
      view.rerender(<FilePickerButton label="Pick" onPick={vi.fn()} />);
      expect(screen.getByLabelText('Pick')).not.toHaveFocus();
    });
  });
});
