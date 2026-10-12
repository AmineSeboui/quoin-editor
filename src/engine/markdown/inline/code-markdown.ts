const BACKTICK_RUN = /`+/g;
const NEEDS_PADDING = /^[ `]|[ `]$/;

export function codeSpan(content: string): string {
  const lengths = new Set((content.match(BACKTICK_RUN) ?? []).map((run) => run.length));
  let fence = 1;
  while (lengths.has(fence)) fence++;
  const padding = NEEDS_PADDING.test(content) && /[^ ]/.test(content) ? ' ' : '';
  const ticks = '`'.repeat(fence);
  return `${ticks}${padding}${content}${padding}${ticks}`;
}
