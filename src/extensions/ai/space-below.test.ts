import { spaceBelow } from './space-below';

function column(blocks: number) {
  const canvas = document.body.appendChild(document.createElement('div'));
  canvas.style.cssText = 'display: flex; flex-direction: column; row-gap: 12px';
  return Array.from({ length: blocks }, (_, at) => {
    const shell = canvas.appendChild(document.createElement('div'));
    shell.dataset.blockId = `b${at}`;
    return shell;
  });
}

afterEach(() => document.body.replaceChildren());

describe('spaceBelow, in a flex column with a row gap', () => {
  it('counts the gap under a block another block follows', () => {
    expect(spaceBelow(column(2)[0]).gap).toBe(12);
  });

  it('counts no gap under the last block, as the column has none there', () => {
    expect(spaceBelow(column(2)[1]).gap).toBe(0);
  });
});
