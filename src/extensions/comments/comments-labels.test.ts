import { englishCommentsLabels, resolveCommentsLabels } from './comments-labels';

describe('the comments labels', () => {
  it('are English by default', () => {
    const labels = resolveCommentsLabels();
    expect(labels).toBe(englishCommentsLabels);
    expect(labels.comment).toBe('Comment');
    expect(labels.comments).toBe('Comments');
    expect(labels.showComments(3)).toBe('Comments (3)');
    expect(labels.thread('a word')).toBe('Comment on "a word"');
    expect(labels.threadsHere).toBe('Comments on this text');
    expect(labels.textRemoved).toBe('Text removed');
    expect(labels.addComment).toBe('Add a comment');
    expect(labels.reply).toBe('Reply');
    expect(labels.send).toBe('Send');
    expect(labels.resolve).toBe('Resolve');
    expect(labels.delete).toBe('Delete');
    expect(labels.close).toBe('Close');
    expect(labels.commentCount(1)).toBe('1 comment');
    expect(labels.commentCount(2)).toBe('2 comments');
  });

  it('write when a comment was made in English, and keep a date they cannot read as it came', () => {
    expect(englishCommentsLabels.postedAt('2026-10-22T09:05:00Z')).toMatch(/Oct 22, 2026/);
    expect(englishCommentsLabels.postedAt('yesterday')).toBe('yesterday');
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const labels = resolveCommentsLabels({ resolve: 'R\u00e9soudre', delete: undefined });
    expect(labels.resolve).toBe('R\u00e9soudre');
    expect(labels.delete).toBe('Delete');
    expect(resolveCommentsLabels({ send: undefined })).toBe(englishCommentsLabels);
  });
});
