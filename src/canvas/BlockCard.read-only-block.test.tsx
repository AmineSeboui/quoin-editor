import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileText } from 'lucide-react';
import { QuoinProvider } from '../context';
import { coreBlocks } from '../blocks/core';
import { defineBlock } from '../registry';
import { resetDevWarnings } from '../dev-warn';
import { BlockCard } from './BlockCard';
import type { QuoinBlock } from '../types';

/** A block whose content belongs to a server-side record: there is nothing to edit here,
 *  so the definition supplies a `preview` and no `editor` at all. */
const audit = defineBlock({
  type: 'AUDIT',
  label: 'Audit trail',
  icon: FileText,
  preview: ({ data }) => <p>Signed off by {String(data.approver)}</p>,
});

const block: QuoinBlock = { id: 'a', type: 'AUDIT', data: { approver: 'Dana' } };

function mount(readOnly = false, types = [...coreBlocks, audit]) {
  return render(
    <QuoinProvider value={{ blockTypes: types }}>
      <BlockCard block={block} index={0} readOnly={readOnly} onUpdate={vi.fn()} />
    </QuoinProvider>,
  );
}

beforeEach(() => resetDevWarnings());

describe('a definition with no editor', () => {
  it('draws its preview', () => {
    mount();
    expect(screen.getByText('Signed off by Dana')).toBeInTheDocument();
  });

  it('offers no edit control', () => {
    mount();
    expect(screen.queryByRole('button', { name: /^Edit block/ })).not.toBeInTheDocument();
  });

  it('does not open an editor when the card is clicked', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByText('Signed off by Dana'));
    expect(screen.getByText('Signed off by Dana')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('draws the same preview on a read-only canvas, and says nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mount(true);
    expect(screen.getByText('Signed off by Dana')).toBeInTheDocument();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('an edit-only definition on a read-only canvas', () => {
  /** `preview` stays optional for a block that is only ever edited, but a read-only canvas
   *  draws previews and never editors, so such a block shows nothing but its own label. */
  const scratch = defineBlock({
    type: 'SCRATCH',
    label: 'Scratch note',
    icon: FileText,
    editor: ({ data }) => <textarea aria-label="Scratch" defaultValue={String(data.note ?? '')} />,
  });

  function mountScratch(readOnly: boolean) {
    return render(
      <QuoinProvider value={{ blockTypes: [...coreBlocks, scratch] }}>
        <BlockCard
          block={{ id: 's', type: 'SCRATCH', data: { note: 'hi' } }}
          index={0}
          readOnly={readOnly}
          onUpdate={vi.fn()}
        />
      </QuoinProvider>,
    );
  }

  it('warns the developer, naming the type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mountScratch(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('SCRATCH');
    expect(warn.mock.calls[0][0]).toContain('preview');
    warn.mockRestore();
  });

  it('says nothing on an editable canvas, where the editor is reachable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mountScratch(false);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns once however many blocks of the type are on the canvas', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mountScratch(true);
    mountScratch(true);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
