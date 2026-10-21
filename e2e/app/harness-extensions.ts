import { catalogue } from 'quoin-editor/catalogue';
import { embedExtension, type Unfurl } from 'quoin-editor/embed';
import { emojiExtension } from 'quoin-editor/emoji';
import { findExtension } from 'quoin-editor/find';
import { mathExtension, type RenderMath } from 'quoin-editor/math';
import { mentionExtension, type MentionResult } from 'quoin-editor/mention';
import { statsExtension } from 'quoin-editor/stats';
import { tableExtension } from 'quoin-editor/table';
import { tocExtension } from 'quoin-editor/toc';
import { collaborativeCanvas } from './collab-canvas';

const params = new URLSearchParams(location.search);
// Stands in for a server that reads a page's metadata, so no test depends on the network.
const UNFURL_DELAY = Number(params.get('unfurl') ?? 0);
const unfurl: Unfurl = (url) =>
  new Promise((resolve) =>
    setTimeout(() => resolve({ title: `Unfurled ${new URL(url).hostname}`, description: 'Found by the host' }), UNFURL_DELAY),
  );
// Stands in for a host's renderer, such as KaTeX, so no test needs a math library.
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const renderMath: RenderMath = (latex, { displayMode }) =>
  `<span class="harness-math" data-display="${displayMode}">${escapeHtml(latex)}</span>`;
const MATH = params.get('math');
// Stands in for a host's directory of people, answering after a delay as a server would.
const PEOPLE: MentionResult[] = [
  { id: '1', label: 'Ada Lovelace', kind: 'user', description: 'Mathematician' },
  { id: '2', label: 'Alan Turing', kind: 'user', description: 'Computer scientist' },
  { id: '3', label: 'Adele Goldberg', kind: 'user', avatarUrl: 'https://cdn.quoin.test/adele.png' },
];
const MENTION_DELAY = Number(params.get('mentiondelay') ?? 0);
const searchPeople = (query: string) =>
  new Promise<MentionResult[]>((resolve) =>
    setTimeout(() => resolve(PEOPLE.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase()))), MENTION_DELAY),
  );
const features = () => [
  ...(params.get('table') === '1' ? [tableExtension()] : []),
  ...(params.get('embed') === '1' ? [embedExtension({ unfurl })] : []),
  ...(MATH === null ? [] : [mathExtension({ renderMath: MATH === 'source' ? undefined : renderMath })]),
  ...(params.get('toc') === '1' ? [tocExtension()] : []),
  ...(params.get('mention') === '1'
    ? [mentionExtension({ search: searchPeople, onOpen: (mention) => window.__quoin.opened?.push(mention) })]
    : []),
  ...(params.get('emoji') === '1' ? [emojiExtension()] : []),
  ...(params.get('find') === '1' ? [findExtension()] : []),
  ...(params.has('collab') ? collaborativeCanvas(params) : []),
  ...(params.get('stats') === '1'
    ? [
        statsExtension({
          limit: params.has('limit') ? Number(params.get('limit')) : undefined,
          focusMode: params.get('focus') === '1',
          typography: params.get('typography') === '1',
        }),
      ]
    : []),
];

const everyFeature = () =>
  catalogue({
    embed: { unfurl },
    math: { renderMath },
    mention: { search: searchPeople, onOpen: (mention) => window.__quoin.opened?.push(mention) },
  });

// The whole catalogue, as a host ships it: the harness's own demo blocks stay out, so no name is taken twice.
export const EVERY_FEATURE = params.get('catalogue') === '1';

export const extensions = EVERY_FEATURE ? everyFeature() : features();
