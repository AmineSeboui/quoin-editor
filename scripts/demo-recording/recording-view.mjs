import { RESTING_POINT } from './gestures.mjs';

const ARROW =
  '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><path d="M3 2v16l4.2-4 2.8 6.4 2.6-1.1-2.8-6.3H16z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';

const VIEW_CSS = `
  .site-header, .site-footer, .skip-link, main > :not([data-island]) { display: none !important; }
  .island { margin-block: 0 !important; }
  #demo-cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; pointer-events: none; z-index: 2147483647; }
`;

/** Shows only the page's live editor, sized by `css`, with a drawn mouse pointer the screenshots can see. */
export async function prepareRecordingView(page, css) {
  await page.addStyleTag({ content: VIEW_CSS + css });
  await page.evaluate(
    ({ arrow, rest }) => {
      const cursor = document.createElement('div');
      cursor.id = 'demo-cursor';
      cursor.innerHTML = arrow;
      document.body.append(cursor);
      const place = ({ x, y }) => {
        window.__demoCursor = { x, y };
        cursor.style.transform = `translate(${x - 3}px, ${y - 2}px)`;
      };
      place(rest);
      document.addEventListener('pointermove', (event) => place({ x: event.clientX, y: event.clientY }), true);
    },
    { arrow: ARROW, rest: RESTING_POINT },
  );
}
