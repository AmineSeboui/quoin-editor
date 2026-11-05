import type { CommentsLabels } from '../../extensions/comments/comments-labels';
import { dateAndTime, number, plural } from './format';

const counted = (count: number) => `${number(count)} ${plural(count, { one: 'Kommentar', other: 'Kommentare' })}`;

/** Every string the comments feature shows or speaks, in German. */
export const deCommentsLabels: CommentsLabels = {
  comment: 'Kommentar',
  comments: 'Kommentare',
  showComments: counted,
  thread: (anchorText) => `Kommentar zu „${anchorText}“`,
  threadsHere: 'Kommentare zu diesem Text',
  textRemoved: 'Text entfernt',
  addComment: 'Kommentar hinzufügen',
  reply: 'Antworten',
  send: 'Senden',
  resolve: 'Erledigen',
  delete: 'Löschen',
  close: 'Schließen',
  commentCount: counted,
  postedAt: dateAndTime,
};
