import { defineBlock } from 'quoin-editor';
import { Sticker } from '../../src/icons';

type NoteData = { note: string };

export const noteDemo = defineBlock<NoteData>({
  type: 'NOTE_DEMO',
  label: 'Note',
  icon: Sticker,
  alwaysEditing: true,
  editor: ({ data, onChange }) => (
    <input aria-label="Note text" value={data.note} onChange={(event) => onChange({ note: event.target.value })} />
  ),
  preview: ({ data }) => <p>{data.note}</p>,
  initialData: () => ({ note: '' }),
});
