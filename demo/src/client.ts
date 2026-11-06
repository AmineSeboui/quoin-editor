import '@fontsource-variable/schibsted-grotesk';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import 'quoin-editor/styles.css';
import './styles/site.css';
import './styles/prose.css';
import './styles/code.css';
import './styles/docs.css';
import './styles/demos.css';
import './styles/playground.css';
import './styles/home.css';
import './styles/search.css';
import { wireClips } from './clip-player';
import { addCodeCopyButtons } from './code-copy';
import { wireCopyButton } from './copy-button';
import { addHeadingLinks } from './heading-links';
import { revealCurrentNavItem } from './nav-scroll';
import { wireSearch } from './search/dialog';
import { wireThemeToggle } from './theme-toggle';
import { trackTocSections } from './toc-active';

const toggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
if (toggle) wireThemeToggle(toggle);

addCodeCopyButtons();
addHeadingLinks();
trackTocSections();
revealCurrentNavItem();
wireClips();

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) wireCopyButton(button);

const searchOpen = document.querySelector<HTMLButtonElement>('[data-search-open]');
const searchDialog = document.querySelector<HTMLDialogElement>('[data-search-dialog]');
if (searchOpen && searchDialog) wireSearch(searchOpen, searchDialog);

for (const element of document.querySelectorAll<HTMLElement>('[data-island]')) {
  import('./islands/mount')
    .then(({ mountIsland }) => mountIsland(element))
    .catch((error: unknown) => console.error('The live editor did not load; the page keeps its static copy.', error));
}
