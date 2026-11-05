import type { CommentsLabels } from '../../extensions/comments/comments-labels';
import { dateAndTime, number, plural } from './format';

const counted = (count: number) => `${number(count)} ${plural(count, { one: 'comentário', other: 'comentários' })}`;

/** Every string the comments feature shows or speaks, in Portuguese. */
export const ptCommentsLabels: CommentsLabels = {
  comment: 'Comentário',
  comments: 'Comentários',
  showComments: counted,
  thread: (anchorText) => `Comentário sobre "${anchorText}"`,
  threadsHere: 'Comentários sobre este texto',
  textRemoved: 'Texto removido',
  addComment: 'Adicionar um comentário',
  reply: 'Responder',
  send: 'Enviar',
  resolve: 'Resolver',
  delete: 'Excluir',
  close: 'Fechar',
  commentCount: counted,
  postedAt: dateAndTime,
};
