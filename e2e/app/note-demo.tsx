import { StickyNote } from 'lucide-react';
import { defineBlock } from 'quoin-editor';

type NoteData = { note: string };

export const noteDemo = defineBlock<NoteData>({
  type: 'NOTE_DEMO',
  label: 'Note',
  icon: StickyNote,
  alwaysEditing: true,
  editor: ({ data, onChange }) => (
    <input aria-label="Note text" value={data.note} onChange={(event) => onChange({ note: event.target.value })} />
  ),
  preview: ({ data }) => <p>{data.note}</p>,
  initialData: () => ({ note: '' }),
});
