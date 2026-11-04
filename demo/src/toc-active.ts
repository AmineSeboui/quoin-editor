const PASSED = 120;

type Section = { link: HTMLAnchorElement; heading: HTMLElement };

const sectionsOf = (): Section[] =>
  [...document.querySelectorAll<HTMLAnchorElement>('.page-toc a')]
    .map((link) => ({ link, heading: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter((section): section is Section => section.heading !== null);

/** Marks the table of contents entry for the section the reader has reached. */
export function trackTocSections() {
  const sections = sectionsOf();
  if (sections.length === 0) return;

  let current: HTMLAnchorElement | undefined;
  let queued = false;

  const update = () => {
    queued = false;
    const reached = sections.filter(({ heading }) => heading.getBoundingClientRect().top <= PASSED);
    const active = reached.at(-1)?.link;
    if (active === current) return;
    current?.removeAttribute('aria-current');
    active?.setAttribute('aria-current', 'true');
    current = active;
  };

  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
}
