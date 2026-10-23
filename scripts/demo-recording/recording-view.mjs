const ARROW =
  '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><path d="M3 2v16l4.2-4 2.8 6.4 2.6-1.1-2.8-6.3H16z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';

const VIEW_CSS = `
  header, .hero, .proofs, footer, .skip-link { display: none !important; }
  html { font-size: 20px; }
  main { padding-top: 110px !important; }
  #demo-cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; pointer-events: none; z-index: 2147483647; }
`;

/** Shows only the home page's editor and its markdown panel, larger, with a drawn mouse pointer the screenshots can see. */
export async function prepareRecordingView(page) {
  await page.addStyleTag({ content: VIEW_CSS });
  await page.evaluate((arrow) => {
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.innerHTML = arrow;
    document.body.append(cursor);
    const place = ({ x, y }) => {
      window.__demoCursor = { x, y };
      cursor.style.transform = `translate(${x - 3}px, ${y - 2}px)`;
    };
    place({ x: 1180, y: 660 });
    document.addEventListener('pointermove', (event) => place({ x: event.clientX, y: event.clientY }), true);
  }, ARROW);
}
