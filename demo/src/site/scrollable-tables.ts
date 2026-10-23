const TABLE = /<table(?=[\s>])[\s\S]*?<\/table>/g;

const headerText = (table: string) =>
  [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)]
    .map(([, cell]) => cell.replace(/<[^>]+>/g, '').trim())
    .filter((cell) => cell !== '')
    .join(', ');

/**
 * Wraps each table in a region that scrolls sideways and the keyboard can reach, rather than widening the page on a
 * narrow screen, each region named after its table's header cells and numbered when two would share a name.
 */
export function scrollableTables(html: string): string {
  const named = new Map<string, number>();
  return html.replace(TABLE, (table) => {
    const header = headerText(table) || 'Table';
    const seen = (named.get(header) ?? 0) + 1;
    named.set(header, seen);
    const label = `${seen === 1 ? header : `${header} (${seen})`}, a table that scrolls sideways`;
    return `<div class="table-scroll" role="region" aria-label="${label.replace(/"/g, '&quot;')}" tabindex="0">${table}</div>`;
  });
}
