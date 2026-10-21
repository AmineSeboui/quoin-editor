'use client';

import { useRef, useState, type Ref } from 'react';
import { sanitizeHref } from '../../engine';
import { selectHandlers } from '../../blocks/void/select-handlers';
import type { ViewController } from '../../view';
import { domainOf, webAddress } from '../web-address';

type LinkCardProps = {
  controller: ViewController;
  blockId: string;
  url: string;
  title?: string;
  description?: string;
  image?: string;
  readOnly: boolean;
  linkRef?: Ref<HTMLAnchorElement>;
};

/**
 * A card for a page: its title, or else its address, linked to it in a new tab, then its description and its domain,
 * and its picture when that is a web address. A press elsewhere on the card of an editable canvas selects the block,
 * and Escape on the link goes back to the block.
 */
export function LinkCard({ controller, blockId, url, title, description, image, readOnly, linkRef }: LinkCardProps) {
  const card = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const href = sanitizeHref(url);
  const domain = domainOf(url);
  const picture = webAddress(image);
  const name = title || url;

  return (
    <div ref={card} className="quoin-link-card" {...(readOnly ? undefined : selectHandlers(controller, blockId, card))}>
      <div className="quoin-link-card-text">
        {href === null ? (
          <span className="quoin-link-card-title">{name}</span>
        ) : (
          <a
            ref={linkRef}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="quoin-link-card-title"
            tabIndex={readOnly ? undefined : -1}
          >
            {name}
          </a>
        )}
        {description && <p className="quoin-link-card-description">{description}</p>}
        {domain !== null && <span className="quoin-link-card-domain">{domain}</span>}
      </div>
      {picture !== null && picture !== failed && (
        <img
          src={picture}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          draggable={false}
          className="quoin-link-card-image"
          onError={() => setFailed(picture)}
        />
      )}
    </div>
  );
}
