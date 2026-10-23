const STORAGE_KEY = 'quoin-theme';

function store(theme: 'dark' | 'light') {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    return;
  }
}

/** Wires the header's theme button to the `.dark` class the head script set before the first paint. */
export function wireThemeToggle(button: HTMLButtonElement) {
  const root = document.documentElement;
  const show = () => button.setAttribute('aria-pressed', String(root.classList.contains('dark')));
  show();
  button.addEventListener('click', () => {
    const dark = root.classList.toggle('dark');
    store(dark ? 'dark' : 'light');
    show();
  });
}
