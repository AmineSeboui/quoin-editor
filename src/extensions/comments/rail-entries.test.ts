import { buildState } from '../../engine/test-support/build-state';
import type { CommentThread } from './comment-threads';
import { railEntries } from './rail-entries';

const span = (id: string, inner: string) => `<span data-comment="${id}">${inner}</span>`;
const thread = (id: string, resolved = false): CommentThread => ({ id, resolved, comments: [] });

describe('the threads beside the document', () => {
  const { doc } = buildState([`a ${span('late', 'b')} ${span('early', 'c')}`, `${span('first', 'd')}`]);

  it('are the open threads, those with text in the order of their text, then those whose text is gone', () => {
    const threads = [thread('gone'), thread('late'), thread('first'), thread('early'), thread('done', true)];
    const entries = railEntries(doc, threads.slice(0, 4));
    expect(entries.map(({ thread: { id } }) => id)).toEqual(['late', 'early', 'first', 'gone']);
    expect(railEntries(doc, threads).map(({ thread: { id } }) => id)).not.toContain('done');
  });

  it('carry the text each one is anchored to, and none for a thread whose text is gone', () => {
    const [late, , gone] = railEntries(doc, [thread('late'), thread('first'), thread('gone')]);
    expect(late).toMatchObject({ anchorText: 'b', ranges: [{ block: 'b0', from: 2, to: 3 }] });
    expect(gone).toMatchObject({ anchorText: '', ranges: [] });
  });

  it('leave out a thread this canvas resolved or deleted while the host has not yet said so', () => {
    const gone = thread('gone');
    const ended = [{ id: 'gone', seen: gone }];
    expect(railEntries(doc, [thread('late'), gone], ended).map(({ thread: { id } }) => id)).toEqual(['late']);
  });

  it('follow the host again once it sets that thread anew, as when it reopens it', () => {
    const ended = [{ id: 'gone', seen: thread('gone') }];
    expect(railEntries(doc, [thread('gone')], ended).map(({ thread: { id } }) => id)).toEqual(['gone']);
  });

  it('leave out an anchor whose thread the host does not know yet', () => {
    expect(railEntries(doc, [thread('first')]).map(({ thread: { id } }) => id)).toEqual(['first']);
  });
});
