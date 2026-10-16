import { Bookmark } from 'lucide-react';
import { defineBlock } from 'quoin-editor';

type BookmarkData = { url: string };

export const bookmarkDemo = defineBlock<BookmarkData>({
  type: 'BOOKMARK_DEMO',
  label: 'Bookmark',
  icon: Bookmark,
  editor: ({ data, onChange }) => (
    <input aria-label="Bookmark URL" value={data.url} onChange={(event) => onChange({ url: event.target.value })} />
  ),
  preview: ({ data }) => <p>{data.url}</p>,
  initialData: () => ({ url: '' }),
});
