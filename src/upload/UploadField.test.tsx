import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoinProvider } from '../context';
import type { QuoinLabels } from '../i18n/labels';
import { resolveLabels } from '../i18n/resolve-labels';
import { UploadField } from './UploadField';
import { dropFocusLikeABrowser } from './test-focus';
import type { UploadFn } from '../types';

function setup(upload?: UploadFn, onUploaded = vi.fn(), labels?: QuoinLabels) {
  const onError = vi.fn();
  render(
    <QuoinProvider value={{ blockTypes: [], upload, onError, labels }}>
      <UploadField category="image" label="Upload image" onUploaded={onUploaded} />
    </QuoinProvider>,
  );
  return { onUploaded, onError };
}

const file = () => new File(['x'], 'photo.png', { type: 'image/png' });

describe('UploadField', () => {
  it('reports the stored key to the caller on success', async () => {
    const user = userEvent.setup();
    const upload = vi.fn().mockResolvedValue({ storageKey: 'k/1', filename: 'photo.png', size: 1 });
    const { onUploaded } = setup(upload);
    await user.upload(screen.getByLabelText('Upload image'), file());
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith({ storageKey: 'k/1', filename: 'photo.png', size: 1 }));
  });

  it('passes the category through to the host adapter', async () => {
    const user = userEvent.setup();
    const upload = vi.fn().mockResolvedValue({ storageKey: 'k/1', filename: 'photo.png', size: 1 });
    setup(upload);
    await user.upload(screen.getByLabelText('Upload image'), file());
    await waitFor(() => expect(upload).toHaveBeenCalledWith(expect.any(File), 'image'));
  });

  it("shows the adapter's message when the upload rejects", async () => {
    const user = userEvent.setup();
    const upload = vi.fn().mockRejectedValue(new Error('Images must be under 5 MB.'));
    setup(upload);
    await user.upload(screen.getByLabelText('Upload image'), file());
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Images must be under 5 MB\.$/);
  });

  it('disables itself with an explanation when no upload function is configured', () => {
    setup(undefined);
    expect(screen.getByLabelText('Upload image')).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent(/uploads are not configured/i);
  });

  it('does not call the caller back when the upload rejects', async () => {
    const user = userEvent.setup();
    const upload = vi.fn().mockRejectedValue(new Error('nope'));
    const { onUploaded } = setup(upload);
    await user.upload(screen.getByLabelText('Upload image'), file());
    await screen.findByRole('alert');
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it('shows a generic message when the rejection carries an empty message', async () => {
    const user = userEvent.setup();
    setup(vi.fn().mockRejectedValue(new Error('')));
    await user.upload(screen.getByLabelText('Upload image'), file());
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Upload failed\.$/);
  });

  it('shows a generic message when the rejection is not an Error', async () => {
    const user = userEvent.setup();
    setup(vi.fn().mockRejectedValue('boom'));
    await user.upload(screen.getByLabelText('Upload image'), file());
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Upload failed\.$/);
  });

  it('does not report a throwing callback as an upload failure', async () => {
    const user = userEvent.setup();
    const upload = vi.fn().mockResolvedValue({ storageKey: 'k/1', filename: 'photo.png', size: 1 });
    const boom = new Error('callback broke');
    const { onError } = setup(upload, vi.fn().mockImplementation(() => { throw boom; }));
    await user.upload(screen.getByLabelText('Upload image'), file());
    await waitFor(() => expect(onError).toHaveBeenCalledWith(boom));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Upload image')).toBeEnabled();
  });

  it('keeps the control busy until an async callback settles', async () => {
    const user = userEvent.setup();
    let settle: () => void = () => {};
    const upload = vi.fn().mockResolvedValue({ storageKey: 'k/1', filename: 'photo.png', size: 1 });
    const { onUploaded } = setup(upload, vi.fn().mockReturnValue(new Promise<void>((resolve) => { settle = resolve; })));
    await user.upload(screen.getByLabelText('Upload image'), file());
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Upload image')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Uploading...');
    settle();
    await waitFor(() => expect(screen.getByLabelText('Upload image')).toBeEnabled());
    expect(screen.getByRole('status')).not.toHaveTextContent('Uploading...');
  });

  it('reports a rejecting async callback through onError once and stays usable', async () => {
    const user = userEvent.setup();
    const upload = vi.fn().mockResolvedValue({ storageKey: 'k/1', filename: 'photo.png', size: 1 });
    const boom = new Error('async callback broke');
    const { onError } = setup(upload, vi.fn().mockRejectedValue(boom));
    await user.upload(screen.getByLabelText('Upload image'), file());
    await waitFor(() => expect(onError).toHaveBeenCalledWith(boom));
    await waitFor(() => expect(screen.getByLabelText('Upload image')).toBeEnabled());
    expect(onError).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('disables the control and announces progress while an upload is in flight', async () => {
    const user = userEvent.setup();
    let finish: (r: { storageKey: string; filename: string; size: number }) => void = () => {};
    const upload = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    setup(upload);
    await user.upload(screen.getByLabelText('Upload image'), file());
    expect(screen.getByLabelText('Upload image')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Uploading...');
    finish({ storageKey: 'k/1', filename: 'photo.png', size: 1 });
    await waitFor(() => expect(screen.getByLabelText('Upload image')).toBeEnabled());
    expect(screen.getByRole('status')).not.toHaveTextContent('Uploading...');
  });

  it('clears a previous error when a later upload succeeds', async () => {
    const user = userEvent.setup();
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce({ storageKey: 'k/1', filename: 'photo.png', size: 1 });
    const { onUploaded } = setup(upload);
    await user.upload(screen.getByLabelText('Upload image'), file());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.upload(screen.getByLabelText('Upload image'), file());
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  describe('announces the result', () => {
    const stored = { storageKey: 'k/1', filename: 'photo.png', size: 1 };

    it('names the stored file once an async callback has taken the upload in', async () => {
      const user = userEvent.setup();
      let settle: () => void = () => {};
      const onUploaded = vi.fn().mockReturnValue(new Promise<void>((resolve) => { settle = resolve; }));
      setup(vi.fn().mockResolvedValue({ ...stored, filename: 'stored-name.png' }), onUploaded);
      await user.upload(screen.getByLabelText('Upload image'), file());
      await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
      expect(screen.getByRole('status')).toHaveTextContent(/^Uploading\.\.\.$/);
      settle();
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^Uploaded stored-name\.png$/));
    });

    it('names the picked file when the host returns no filename', async () => {
      const user = userEvent.setup();
      setup(vi.fn().mockResolvedValue({ ...stored, filename: '' }));
      await user.upload(screen.getByLabelText('Upload image'), file());
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^Uploaded photo\.png$/));
    });

    it('announces no success when the async callback rejects, and reports it once', async () => {
      const user = userEvent.setup();
      const boom = new Error('async callback broke');
      const { onError } = setup(vi.fn().mockResolvedValue(stored), vi.fn().mockRejectedValue(boom));
      await user.upload(screen.getByLabelText('Upload image'), file());
      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByLabelText('Upload image')).toBeEnabled());
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('replaces the last success when the next upload starts and when it fails', async () => {
      const user = userEvent.setup();
      let fail: (reason: Error) => void = () => {};
      const upload = vi
        .fn()
        .mockResolvedValueOnce(stored)
        .mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }));
      setup(upload);
      await user.upload(screen.getByLabelText('Upload image'), file());
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Uploaded photo.png'));
      await user.upload(screen.getByLabelText('Upload image'), file());
      expect(screen.getByRole('status')).toHaveTextContent(/^Uploading\.\.\.$/);
      await act(async () => fail(new Error('second failed')));
      expect(await screen.findByRole('alert')).toHaveTextContent('second failed');
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('keeps the status region in the page while nothing is happening, so a screen reader hears its first message', () => {
      setup(vi.fn());
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
  });

  describe('speaks the labels the canvas was given', () => {
    const labels = resolveLabels({
      uploading: 'Envoi en cours',
      uploaded: (name) => `Envoy\u00e9 ${name}`,
      uploadFailed: '\u00c9chec de l\u2019envoi',
      uploadsUnavailable: 'Envoi non configur\u00e9',
    });
    const stored = { storageKey: 'k/1', filename: 'photo.png', size: 1 };

    it('while it uploads and once it has', async () => {
      const user = userEvent.setup();
      let finish: (r: typeof stored) => void = () => {};
      setup(vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; })), vi.fn(), labels);
      await user.upload(screen.getByLabelText('Upload image'), file());
      expect(screen.getByRole('status')).toHaveTextContent(/^Envoi en cours$/);
      finish(stored);
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^Envoy\u00e9 photo\.png$/));
    });

    it('when the host rejects without a message', async () => {
      const user = userEvent.setup();
      setup(vi.fn().mockRejectedValue('boom'), vi.fn(), labels);
      await user.upload(screen.getByLabelText('Upload image'), file());
      expect(await screen.findByRole('alert')).toHaveTextContent(/^\u00c9chec de l\u2019envoi$/);
    });

    it('when no upload function is configured', () => {
      setup(undefined, vi.fn(), labels);
      expect(screen.getByRole('note')).toHaveTextContent(/^Envoi non configur\u00e9$/);
    });
  });

  it('keeps focus on its button after the upload, though the browser dropped it while the input was disabled', async () => {
    const user = userEvent.setup();
    let finish: (r: { storageKey: string; filename: string; size: number }) => void = () => {};
    setup(vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; })));
    const input = screen.getByLabelText('Upload image');
    await user.upload(input, file());
    expect(input).toBeDisabled();
    dropFocusLikeABrowser(input as HTMLInputElement);
    finish({ storageKey: 'k/1', filename: 'photo.png', size: 1 });
    await waitFor(() => expect(input).toBeEnabled());
    await waitFor(() => expect(input).toHaveFocus());
  });
});
