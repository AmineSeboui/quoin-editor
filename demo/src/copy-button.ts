import { announce } from './announce';

const CONFIRM_FOR = 1600;

/** Reveals a button that copies its `data-copy` text, and shows a check while the copy is fresh. */
export function wireCopyButton(button: HTMLButtonElement) {
  const text = button.dataset.copy;
  if (!text || !navigator.clipboard) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  button.hidden = false;
  button.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(
      () => {
        button.dataset.copied = '';
        announce('Copied');
        clearTimeout(timer);
        timer = setTimeout(() => delete button.dataset.copied, CONFIRM_FOR);
      },
      (error: unknown) => {
        announce('The copy did not go through');
        console.error('The install command was not copied.', error);
      },
    );
  });
}
