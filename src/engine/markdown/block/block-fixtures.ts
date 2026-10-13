import { fromMarkdown } from './from-markdown';

export const parse = (markdown: string, softBreak: 'newline' | 'space' = 'space') => {
  let n = 0;
  return fromMarkdown(markdown, { softBreak, newId: () => `b${++n}` }).map(({ id: _id, ...rest }) => rest);
};

export const md = (markdown: string, indent?: number) => ({
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent ? { indent } : {}),
});

export const code = (source: string, language = '', indent?: number) => ({
  type: 'CODE',
  data: { language, code: source },
  ...(indent ? { indent } : {}),
});
