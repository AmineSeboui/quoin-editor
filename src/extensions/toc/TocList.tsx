import { blockFragment } from '../../canvas/block-link';
import type { HeadingNode } from '../../engine/render/heading-tree';
import type { TocHeading } from './headings';

type TocListProps = { nodes: readonly HeadingNode<TocHeading>[]; inTabOrder: boolean };

/** The headings as nested lists of links to their blocks. */
export function TocList({ nodes, inTabOrder }: TocListProps) {
  return (
    <ul className="quoin-toc-list">
      {nodes.map(({ heading, children }) => (
        <li key={heading.blockId}>
          <a href={blockFragment(heading.blockId)} tabIndex={inTabOrder ? undefined : -1} className="quoin-toc-link">
            {heading.text}
          </a>
          {children.length > 0 && <TocList nodes={children} inTabOrder={inTabOrder} />}
        </li>
      ))}
    </ul>
  );
}
