/** Every string comments show or speak. */
export type CommentsLabels = {
  /** The toolbar button that comments on the selected text. */
  comment: string;
  /** The name of the list of threads beside the document, and of the sheet that holds it on a narrow canvas. */
  comments: string;
  /** The button that opens the sheet of threads on a narrow canvas, given how many threads are open. */
  showComments(count: number): string;
  /** The name of a thread, given the text it is anchored to. */
  thread(anchorText: string): string;
  /** The name of the list to choose from when several threads are anchored to the text clicked. */
  threadsHere: string;
  /** Shown for a thread whose text has all been deleted. */
  textRemoved: string;
  /** The field for the first comment of a thread with none. */
  addComment: string;
  /** The field for a reply. */
  reply: string;
  send: string;
  resolve: string;
  delete: string;
  close: string;
  commentCount(count: number): string;
  /** When a comment was made, given its `createdAt`. */
  postedAt(createdAt: string): string;
};

const DATE = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

function englishDate(createdAt: string): string {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? createdAt : DATE.format(date);
}

export const englishCommentsLabels: CommentsLabels = {
  comment: 'Comment',
  comments: 'Comments',
  showComments: (count) => `Comments (${count})`,
  thread: (anchorText) => `Comment on "${anchorText}"`,
  threadsHere: 'Comments on this text',
  textRemoved: 'Text removed',
  addComment: 'Add a comment',
  reply: 'Reply',
  send: 'Send',
  resolve: 'Resolve',
  delete: 'Delete',
  close: 'Close',
  commentCount: (count) => `${count} ${count === 1 ? 'comment' : 'comments'}`,
  postedAt: englishDate,
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveCommentsLabels(overrides?: Partial<CommentsLabels>): CommentsLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishCommentsLabels : { ...englishCommentsLabels, ...Object.fromEntries(given) };
}
