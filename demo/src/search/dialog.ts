import { BASE } from '../site/site';
import { search, type Hit, type SearchRecord } from './query';

const DEBOUNCE = 120;

const hrefOf = ({ path, id }: SearchRecord) => `${BASE}${path}${id ? `#${id}` : ''}`;

function hitElement(hit: Hit, index: number) {
  const { record, snippet } = hit;
  const link = document.createElement('a');
  link.className = 'search-hit';
  link.id = `search-hit-${index}`;
  link.role = 'option';
  link.href = hrefOf(record);

  const title = document.createElement('span');
  title.className = 'search-hit-title';
  title.textContent = record.section ? `${record.title} · ${record.section}` : record.title;

  const text = document.createElement('span');
  text.className = 'search-hit-text';
  const mark = document.createElement('mark');
  mark.textContent = snippet.match;
  text.append(snippet.before, mark, snippet.after);

  link.append(title, text);
  return link;
}

export function wireSearch(open: HTMLButtonElement, dialog: HTMLDialogElement) {
  const input = dialog.querySelector<HTMLInputElement>('[data-search-input]');
  const results = dialog.querySelector<HTMLElement>('[data-search-results]');
  const message = dialog.querySelector<HTMLElement>('[data-search-message]');
  if (!input || !results || !message) return;

  let records: SearchRecord[] | undefined;
  let loading: Promise<void> | undefined;
  let active = -1;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const options = () => [...results.querySelectorAll<HTMLAnchorElement>('.search-hit')];

  const highlight = (next: number) => {
    const all = options();
    if (all.length === 0) return;
    active = (next + all.length) % all.length;
    for (const [index, option] of all.entries()) option.toggleAttribute('data-active', index === active);
    input.setAttribute('aria-activedescendant', all[active].id);
    all[active].scrollIntoView({ block: 'nearest' });
  };

  const show = (hits: Hit[], query: string) => {
    results.replaceChildren(...hits.map(hitElement));
    input.setAttribute('aria-expanded', String(hits.length > 0));
    input.removeAttribute('aria-activedescendant');
    active = -1;
    message.hidden = hits.length > 0;
    if (hits.length === 0) {
      message.textContent = query
        ? `Nothing in the guide matches “${query}”. Try a shorter word, or the name of an export.`
        : 'Type to search the guide, the comparison and the changelog.';
    }
    if (hits.length > 0) highlight(0);
  };

  const load = () => {
    loading ??= fetch(`${BASE}search-index.json`)
      .then((response) => response.json() as Promise<SearchRecord[]>)
      .then((loaded) => {
        records = loaded;
      })
      .catch((error: unknown) => {
        message.textContent = 'The search index did not load. The guide is still in the left hand list.';
        console.error('The search index did not load.', error);
      });
    return loading;
  };

  const run = () => {
    const query = input.value.trim();
    if (!records || query === '') return show([], query);
    show(search(records, query), query);
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => void load().then(run), DEBOUNCE);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlight(active + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlight(active - 1);
    } else if (event.key === 'Enter') {
      const option = options()[active];
      if (option) {
        event.preventDefault();
        option.click();
      }
    }
  });

  dialog.addEventListener('close', () => {
    document.documentElement.removeAttribute('data-dialog');
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  const openDialog = () => {
    document.documentElement.dataset.dialog = 'open';
    dialog.showModal();
    input.select();
    void load().then(run);
  };

  open.hidden = false;
  open.addEventListener('click', openDialog);

  addEventListener('keydown', (event) => {
    const typing = event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable]');
    const shortcut = (event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing);
    if (!shortcut || dialog.open) return;
    event.preventDefault();
    openDialog();
  });
}
