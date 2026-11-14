// Chinese and Japanese, written without spaces, break between any two characters. Korean spaces its words.
const IDEOGRAPHIC = /[\u2E80-\u303F\u3040-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFF60\u{20000}-\u{3FFFF}]/u;
const CLOSING = /[)\]}.,!?:;%\u3001\u3002\u3009\u300B\u300D\u300F\u3011\u3015\u30FB\u30FC\uFF01\uFF09\uFF0C\uFF0E\uFF1A\uFF1B\uFF1F\u2026]/;
const OPENING = /[([{\u3008\u300A\u300C\u300E\u3010\u3014\uFF08]/;

/** Whether a line may break between two characters with no space between them. */
export function breaksBetween(before: string, after: string): boolean {
  if (CLOSING.test(after) || OPENING.test(before)) return false;
  return IDEOGRAPHIC.test(before) || IDEOGRAPHIC.test(after);
}
