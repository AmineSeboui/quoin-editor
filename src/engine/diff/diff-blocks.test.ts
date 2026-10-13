import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import { diffBlocks } from './diff-blocks';

const md = (id: string, markdown: string) => ({ id, type: 'MARKDOWN', data: { markdown } });

describe('diffBlocks', () => {
  it('reports equal, inserted, deleted and changed blocks', () => {
    const diff = diffBlocks([md('a', 'same'), md('b', 'old words here'), md('c', 'gone')], [md('a', 'same'), md('b', 'new words here'), md('d', 'added')]);
    expect(diff.map((d) => d.op)).toEqual(['equal', 'change', 'delete', 'insert']);
    const change = diff[1] as Extract<(typeof diff)[number], { op: 'change' }>;
    expect(change.regions.text).toEqual([
      { op: 'delete', inline: [text('old')] },
      { op: 'insert', inline: [text('new')] },
      { op: 'equal', inline: [text(' words here')] },
    ]);
    expect(change.attrsChanged).toBe(false);
  });

  it('flags moved blocks', () => {
    const diff = diffBlocks([md('a', '1'), md('b', '2')], [md('b', '2'), md('a', '1')]);
    expect(diff.filter((d) => 'moved' in d && d.moved)).toHaveLength(2);
  });

  it('sees a kind change as an attribute change', () => {
    const [d] = diffBlocks([md('a', 'x')], [md('a', '## x')]);
    expect(d).toMatchObject({ op: 'change', attrsChanged: true });
  });
});
