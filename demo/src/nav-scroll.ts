const navs = () => document.querySelectorAll<HTMLElement>('.site-nav, .guide-nav');

const measure = (nav: HTMLElement) => {
  const scrolls = nav.scrollWidth > nav.clientWidth + 1;
  nav.toggleAttribute('data-overflow', scrolls);
  return scrolls;
};

/** Marks a nav that is wider than its box, and brings the current page into view inside it. */
export function revealCurrentNavItem() {
  for (const nav of navs()) {
    if (!measure(nav)) continue;
    const current = nav.querySelector<HTMLElement>('a[aria-current]');
    if (current) nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  }
  addEventListener('resize', () => {
    for (const nav of navs()) measure(nav);
  });
}
