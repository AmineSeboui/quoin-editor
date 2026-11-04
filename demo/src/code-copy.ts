const LABELS: Record<string, string> = { bash: 'command', tsx: 'code', ts: 'code', json: 'JSON', css: 'CSS' };

const languageOf = (code: Element) => /language-([a-z\d]+)/.exec(code.className)?.[1] ?? '';

/** Gives every code block of an article a copy button cloned from the page's template, and the language it holds. */
export function addCodeCopyButtons() {
  const template = document.querySelector<HTMLTemplateElement>('#copy-template');
  const button = template?.content.querySelector('button');
  if (!button) return;
  for (const pre of document.querySelectorAll<HTMLPreElement>('.article pre')) {
    const code = pre.querySelector('code');
    if (!code) continue;
    const block = document.createElement('div');
    block.className = 'code-block';
    pre.replaceWith(block);
    block.append(pre);

    const language = languageOf(code);
    if (language) block.dataset.language = language;

    const copy = button.cloneNode(true) as HTMLButtonElement;
    copy.dataset.copy = code.textContent ?? '';
    copy.setAttribute('aria-label', `Copy the ${LABELS[language] ?? 'code'}`);
    copy.hidden = true;
    block.append(copy);
  }
}
