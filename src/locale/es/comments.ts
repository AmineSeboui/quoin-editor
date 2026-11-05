import type { CommentsLabels } from '../../extensions/comments/comments-labels';
import { dateAndTime, number, plural } from './format';

const counted = (count: number) => `${number(count)} ${plural(count, { one: 'comentario', other: 'comentarios' })}`;

/** Every string the comments feature shows or speaks, in Spanish. */
export const esCommentsLabels: CommentsLabels = {
  comment: 'Comentario',
  comments: 'Comentarios',
  showComments: counted,
  thread: (anchorText) => `Comentario sobre «${anchorText}»`,
  threadsHere: 'Comentarios sobre este texto',
  textRemoved: 'Texto eliminado',
  addComment: 'Añadir un comentario',
  reply: 'Responder',
  send: 'Enviar',
  resolve: 'Resolver',
  delete: 'Eliminar',
  close: 'Cerrar',
  commentCount: counted,
  postedAt: dateAndTime,
};
