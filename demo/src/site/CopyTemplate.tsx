import { CheckIcon, CopyIcon } from './icons';

/** The markup `code-copy.ts` clones into each code block, so the icons stay React and never become strings. */
export function CopyTemplate() {
  return (
    <template id="copy-template">
      <button type="button" className="icon-button copy-button">
        <CopyIcon />
        <CheckIcon />
      </button>
    </template>
  );
}
