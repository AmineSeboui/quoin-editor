import * as comments from './comments';

describe('the comments entry', () => {
  it('exports comments, their threads store, the store kept in a Yjs document and their labels', () => {
    expect(Object.keys(comments).sort()).toEqual([
      'commentsExtension',
      'createCommentThreads',
      'englishCommentsLabels',
      'yjsCommentThreads',
    ]);
  });
});
