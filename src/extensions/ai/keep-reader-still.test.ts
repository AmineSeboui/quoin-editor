import { keepReaderStill } from './keep-reader-still';

const rect = (top: number, bottom: number) => ({ top, bottom }) as DOMRect;

function scrolledPast() {
  const root = document.body.appendChild(document.createElement('div'));
  root.style.overflowY = 'auto';
  Object.defineProperty(root, 'scrollHeight', { value: 1000 });
  Object.defineProperty(root, 'clientHeight', { value: 100 });
  root.getBoundingClientRect = () => rect(0, 100);
  const shell = root.appendChild(document.createElement('div'));
  shell.getBoundingClientRect = () => rect(-80, -40);
  const next = root.appendChild(document.createElement('div'));
  let top = -40;
  next.getBoundingClientRect = () => rect(top, top + 20);
  const scrollBy = vi.fn();
  root.scrollBy = scrollBy;
  return { root, shell, scrollBy, grow: (by: number) => void (top += by) };
}

afterEach(() => document.body.replaceChildren());

describe('keepReaderStill, the reader having scrolled past the block', () => {
  it('scrolls back by what the change moved the content below', () => {
    const { root, shell, scrollBy, grow } = scrolledPast();
    keepReaderStill(root, shell, () => grow(30));
    expect(scrollBy).toHaveBeenCalledWith({ top: 30, behavior: 'instant' });
  });

  it('scrolls nothing when the change moved nothing', () => {
    const { root, shell, scrollBy } = scrolledPast();
    keepReaderStill(root, shell, () => {});
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
