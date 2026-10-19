import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Paperclip } from 'lucide-react';
import { BlockCanvas } from '../canvas/BlockCanvas';
import { coreBlocks } from '../blocks/core';
import { defineBlock } from '../registry';
import type { QuoinLabels } from '../i18n/labels';
import type { BlockEditorProps, QuoinBlock, UploadFn } from '../types';
import { UploadField } from './UploadField';

type SlideData = { storageKey: string };

function SlideEditor({ data, onChange }: BlockEditorProps<SlideData>) {
  return (
    <div>
      <p>{data.storageKey === '' ? 'No deck yet' : data.storageKey}</p>
      <UploadField
        category="slides"
        label="Upload slides"
        accept=".pdf"
        onUploaded={(result) => onChange({ storageKey: result.storageKey })}
      />
    </div>
  );
}

const slides = defineBlock({
  type: 'SLIDES',
  label: 'Slides',
  icon: Paperclip,
  editor: SlideEditor,
  alwaysEditing: true,
  initialData: () => ({ storageKey: '' }),
});

const blockTypes = [...coreBlocks, slides];
const blocks: QuoinBlock[] = [{ id: 's', type: 'SLIDES', data: { storageKey: '' } }];

function renderCanvas(upload?: UploadFn, labels?: Partial<QuoinLabels>) {
  const onChange = vi.fn();
  render(<BlockCanvas blocks={blocks} onChange={onChange} blockTypes={blockTypes} upload={upload} labels={labels} />);
  return { onChange };
}

describe('UploadField inside a custom block', () => {
  it('reaches the canvas upload function with no wiring from the block', async () => {
    const user = userEvent.setup();
    const upload = vi.fn().mockResolvedValue({ storageKey: 'deck/1', filename: 'deck.pdf', size: 2 });
    const { onChange } = renderCanvas(upload);
    await user.upload(screen.getByLabelText('Upload slides'), new File(['x'], 'deck.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(upload).toHaveBeenCalledWith(expect.any(File), 'slides'));
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ data: { storageKey: 'deck/1' } })]),
    );
  });

  it('announces the upload in flight to assistive technology', async () => {
    const user = userEvent.setup();
    let finish: (result: { storageKey: string; filename: string; size: number }) => void = () => {};
    const upload = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    renderCanvas(upload);
    await user.upload(screen.getByLabelText('Upload slides'), new File(['x'], 'deck.pdf'));
    expect(screen.getByText('Uploading...')).toHaveAttribute('role', 'status');
    expect(screen.getByLabelText('Upload slides')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText('Upload slides')).toHaveFocus();
    finish({ storageKey: 'deck/1', filename: 'deck.pdf', size: 2 });
    await waitFor(() => expect(screen.queryByText('Uploading...')).toBeNull());
  });

  it('words its messages with the labels given to the canvas', async () => {
    const user = userEvent.setup();
    let finish: (result: { storageKey: string; filename: string; size: number }) => void = () => {};
    const upload = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    renderCanvas(upload, { uploading: 'Envoi en cours', uploaded: (name) => `Envoy\u00e9 ${name}` });
    await user.upload(screen.getByLabelText('Upload slides'), new File(['x'], 'deck.pdf'));
    expect(screen.getByText('Envoi en cours')).toHaveAttribute('role', 'status');
    finish({ storageKey: 'deck/1', filename: 'deck.pdf', size: 2 });
    expect(await screen.findByText('Envoy\u00e9 deck.pdf')).toHaveAttribute('role', 'status');
  });

  it('says so when the canvas was given no upload function', () => {
    renderCanvas(undefined);
    expect(screen.getByLabelText('Upload slides')).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent(/uploads are not configured/i);
  });
});
