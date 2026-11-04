const CLEAR_AFTER = 2000;

let timer: ReturnType<typeof setTimeout> | undefined;

/** Speaks a short message through the page's one status region, for a change a reader would otherwise miss. */
export function announce(message: string) {
  const region = document.querySelector<HTMLElement>('[data-announce]');
  if (!region) return;
  region.textContent = message;
  clearTimeout(timer);
  timer = setTimeout(() => {
    region.textContent = '';
  }, CLEAR_AFTER);
}
