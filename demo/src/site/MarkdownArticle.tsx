import { QuoinView } from 'quoin-editor/view';
import { highlight } from './highlight';
import { markdownBlocks } from './markdown-blocks';

/** A markdown page read by Quoin's own parser and drawn by `QuoinView`, as the server writes it. */
export function MarkdownArticle({ markdown }: { markdown: string }) {
  return <QuoinView blocks={markdownBlocks(markdown)} highlight={highlight} className="prose" />;
}
