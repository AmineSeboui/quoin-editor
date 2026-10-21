import { AppWindow, Bookmark } from 'lucide-react';
import type { SlashItem } from '../ui-types';
import type { EmbedLabels } from './embed-labels';
import { requestLink } from './link-request';

/** Embed and Bookmark, each asking for the link once the slash and the query are gone. */
export const embedSlashItems = (labels: EmbedLabels): SlashItem[] => [
  {
    id: 'embed',
    title: labels.embed,
    description: labels.embedDescription,
    group: 'embeds',
    icon: AppWindow,
    keywords: ['iframe', 'video', 'youtube', 'vimeo', 'loom', 'figma', 'codepen', 'spotify', 'soundcloud'],
    run: ({ controller, range }) => requestLink(controller, { kind: 'embed', at: range }),
  },
  {
    id: 'bookmark',
    title: labels.bookmark,
    description: labels.bookmarkDescription,
    group: 'embeds',
    icon: Bookmark,
    keywords: ['link', 'url', 'card', 'preview', 'web'],
    run: ({ controller, range }) => requestLink(controller, { kind: 'bookmark', at: range }),
  },
];
