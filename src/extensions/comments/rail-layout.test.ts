import { stackTops } from './rail-layout';

describe('placing the threads beside the document', () => {
  it('puts each thread level with its block', () => {
    expect(stackTops([{ top: 0, height: 40 }, { top: 100, height: 40 }], 8)).toEqual([0, 100]);
  });

  it('pushes a thread down below the one before it when their blocks are close', () => {
    expect(stackTops([{ top: 0, height: 60 }, { top: 20, height: 40 }, { top: 30, height: 10 }], 8)).toEqual([
      0, 68, 116,
    ]);
  });

  it('lists the threads with no text after the others', () => {
    expect(stackTops([{ top: 50, height: 40 }, { top: null, height: 30 }, { top: null, height: 30 }], 8)).toEqual([
      50, 98, 136,
    ]);
    expect(stackTops([{ top: null, height: 30 }], 8)).toEqual([0]);
  });
});
