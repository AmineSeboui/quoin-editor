'use client';

import { sanitizeHref } from '../../engine';
import { ExternalLink } from '../../icons';
import { Button } from '../../ui/button';

type OpenLinkButtonProps = { href: string; label: string };

/** Opens a link's address in a new page, for an address the engine keeps as a link and that leads somewhere. */
export function OpenLinkButton({ href, label }: OpenLinkButtonProps) {
  const safe = sanitizeHref(href);
  if (!safe) return null;
  return (
    <Button asChild variant="ghost" size="icon-sm">
      <a href={safe} target="_blank" rel="noopener noreferrer" aria-label={label}>
        <ExternalLink />
      </a>
    </Button>
  );
}
