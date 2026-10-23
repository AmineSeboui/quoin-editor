import type { ViewController } from '../../view';
import type { CommentsHost } from './comments-extension';
import type { CommentsLabels } from './comments-labels';
import type { CommentsLink } from './comments-link';

/** What every part of the comments UI reads: the canvas, the host's threads and callbacks, the labels and the link. */
export type CommentsEnv = {
  readonly controller: ViewController;
  readonly host: CommentsHost;
  readonly labels: CommentsLabels;
  readonly link: CommentsLink;
};
