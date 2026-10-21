'use client';

import { useRef } from 'react';
import { useLabels } from '../../i18n/use-labels';
import type { BlockRenderer } from '../../view';
import { FOCUS_RING } from '../../ui/focus';
import { useReadOnly } from '../../view/react/use-read-only';
import { str } from '../../engine/blocks/data-fields';
import { languageName } from './code-languages';
import { CodeEditor } from './CodeEditor';
import { CopyCodeButton } from './CopyCodeButton';
import { HighlightOverlay } from './HighlightOverlay';
import { LanguageCombobox } from './LanguageCombobox';

export const CodeBlock: BlockRenderer = ({ block, controller }) => {
  const labels = useLabels();
  const readOnly = useReadOnly(controller);
  const languageField = useRef<HTMLInputElement>(null);
  const codeField = useRef<HTMLTextAreaElement>(null);
  const code = str(block.attrs.code);
  const language = str(block.attrs.language);
  const name = languageName(language) ?? language;
  return (
    <div role="group" aria-label={labels.blockNames.code} contentEditable={false} className="quoin-code">
      <div className="quoin-code-header">
        {readOnly ? (
          <span className="quoin-code-language quoin-code-control">
            {name || labels.plainText}
          </span>
        ) : (
          <LanguageCombobox
            blockId={block.id}
            controller={controller}
            language={language}
            field={languageField}
            onDone={() => codeField.current?.focus()}
          />
        )}
        <CopyCodeButton code={code} controller={controller} />
      </div>
      {readOnly ? (
        <div dir="ltr" role="region" aria-label={name || labels.codeText} tabIndex={0} className={`quoin-code-scroll ${FOCUS_RING}`}>
          <HighlightOverlay code={code} language={language} />
        </div>
      ) : (
        <CodeEditor
          block={block}
          controller={controller}
          field={codeField}
          focusControls={() => languageField.current?.focus()}
        />
      )}
    </div>
  );
};
