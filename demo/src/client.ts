import 'quoin-editor/styles.css';
import './styles/site.css';
import './styles/prose.css';
import './styles/code.css';
import './styles/demos.css';
import { wireThemeToggle } from './theme-toggle';

const toggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
if (toggle) wireThemeToggle(toggle);

for (const element of document.querySelectorAll<HTMLElement>('[data-island]')) {
  import('./islands/mount')
    .then(({ mountIsland }) => mountIsland(element))
    .catch((error: unknown) => console.error('The live editor did not load; the page keeps its static copy.', error));
}
