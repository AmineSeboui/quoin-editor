import type { CommentsLabels } from '../../extensions/comments/comments-labels';
import { dateAndTime, number, plural } from './format';

const counted = (count: number) => `${number(count)} ${plural(count, { one: 'commentaire', other: 'commentaires' })}`;

/** Every string the comments feature shows or speaks, in French. */
export const frCommentsLabels: CommentsLabels = {
  comment: 'Commentaire',
  comments: 'Commentaires',
  showComments: counted,
  thread: (anchorText) => `Commentaire sur « ${anchorText} »`,
  threadsHere: 'Commentaires sur ce texte',
  textRemoved: 'Texte supprimé',
  addComment: 'Ajouter un commentaire',
  reply: 'Répondre',
  send: 'Envoyer',
  resolve: 'Résoudre',
  delete: 'Supprimer',
  close: 'Fermer',
  commentCount: counted,
  postedAt: dateAndTime,
};
