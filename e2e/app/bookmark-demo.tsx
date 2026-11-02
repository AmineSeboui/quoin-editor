import { defineBlock } from 'quoin-editor';
import { Bookmark } from '../../src/icons';

type BookmarkData = { url: string };

export const bookmarkDemo = defineBlock<BookmarkData>({
  type: 'BOOKMARK_DEMO',
  label: 'Bookmark',
  icon: Bookmark,
  editor: ({ data, onChange }) => (
    <div>
      <p>Paste the address of the page to bookmark.</p>
      <input aria-label="Bookmark URL" value={data.url} onChange={(event) => onChange({ url: event.target.value })} />
    </div>
  ),
  preview: ({ data }) => <p>{data.url}</p>,
  initialData: () => ({ url: '' }),
});
