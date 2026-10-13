const HTTP_URL = /^(?:https?:\/\/\S|www\.[^\s.])\S*$/i;
const LINKABLE_URL = /^(?:https?:\/\/\S|mailto:\S|www\.[^\s.])\S*$/i;

export function loneUrl(text: string, schemes: 'http' | 'linkable' = 'http'): string | null {
  const url = text.trim();
  return (schemes === 'http' ? HTTP_URL : LINKABLE_URL).test(url) ? url : null;
}
