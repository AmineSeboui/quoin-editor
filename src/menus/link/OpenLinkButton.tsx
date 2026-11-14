'use client';

import { sanitizeHref } from '../../engine';
import { ExternalLink } from '../../icons';
import { IconButton } from '../../ui/icon-button';

type OpenLinkButtonProps = { href: string; label: string };

/** Opens a link's address in a new page, for an address the engine keeps as a link and that leads somewhere. */
export function OpenLinkButton({ href, label }: OpenLinkButtonProps) {
  const safe = sanitizeHref(href);
  if (!safe) return null;
  return (
    <IconButton asChild label={label}>
      <a href={safe} target="_blank" rel="noopener noreferrer">
        <ExternalLink />
      </a>
    </IconButton>
  );
}
