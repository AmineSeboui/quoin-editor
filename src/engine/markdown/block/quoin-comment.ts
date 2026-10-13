export type QuoinComment = { type: string; data: Record<string, unknown>; indent: number };

const TYPE = '[A-Za-z][\\w.:-]*';
const COMMENT = new RegExp(`^<!--\\s*quoin:(${TYPE})(?:\\s+(\\{.*\\}))?\\s*-->[ \\t]*$`);
const TYPE_NAME = new RegExp(`^${TYPE}$`);

export const isQuoinType = (type: string): boolean => TYPE_NAME.test(type);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseQuoinComment(line: string): QuoinComment | null {
  const match = COMMENT.exec(line);
  if (!match) return null;
  const type = match[1] === 'toc' ? 'TOC' : match[1];
  if (match[2] === undefined) return { type, data: {}, indent: 0 };
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(match[2]);
  } catch {
    return null;
  }
  const { data = {}, indent = 0 } = payload;
  if (!isRecord(data) || typeof indent !== 'number' || !Number.isInteger(indent) || indent < 0) return null;
  return { type, data, indent };
}
