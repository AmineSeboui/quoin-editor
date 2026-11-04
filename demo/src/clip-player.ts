import { announce } from './announce';

const PLAY = 'Play the recording';
const PAUSE = 'Pause the recording';

function frameOf(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.className = image.className;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', image.alt);
  canvas.getContext('2d')?.drawImage(image, 0, 0);
  return canvas;
}

/**
 * Gives a looping recording a play and pause control, and leaves it unloaded until asked for when the reader has
 * asked for reduced motion. Pausing swaps the image for the frame it was showing, so the loop stops rather than hides.
 */
export function wireClip(figure: HTMLElement, button: HTMLButtonElement) {
  const image = figure.querySelector('img');
  const source = image?.dataset.clip;
  if (!image || !source) return;

  let frame: HTMLCanvasElement | undefined;

  const state = (next: 'playing' | 'paused') => {
    figure.dataset.state = next;
    button.setAttribute('aria-label', next === 'playing' ? PAUSE : PLAY);
    button.setAttribute('aria-pressed', String(next === 'playing'));
  };

  const play = () => {
    frame?.replaceWith(image);
    frame = undefined;
    image.hidden = false;
    if (!image.getAttribute('src')) image.src = source;
    state('playing');
  };

  const pause = () => {
    if (image.naturalWidth > 0) {
      frame = frameOf(image);
      image.replaceWith(frame);
    } else {
      image.hidden = true;
    }
    image.removeAttribute('src');
    state('paused');
  };

  button.hidden = false;
  button.addEventListener('click', () => {
    const playing = figure.dataset.state === 'playing';
    if (playing) pause();
    else play();
    announce(playing ? 'Recording paused' : 'Recording playing');
  });

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) pause();
  else state('playing');
}

export function wireClips() {
  for (const figure of document.querySelectorAll<HTMLElement>('[data-clip-figure]')) {
    const button = figure.querySelector<HTMLButtonElement>('.clip-toggle');
    if (button) wireClip(figure, button);
  }
}
