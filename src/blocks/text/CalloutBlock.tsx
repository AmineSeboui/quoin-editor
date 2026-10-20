'use client';

import { useLabels } from '../../i18n/use-labels';
import { cn } from '../../ui/cn';
import { EditableRegion, type BlockRenderer } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';
import { TONE } from '../previews';
import { calloutIcon, calloutTone } from './callout-tone';
import { CalloutIconMenu } from './CalloutIconMenu';
import { CalloutToneMenu } from './CalloutToneMenu';

export const CalloutBlock: BlockRenderer = ({ block, controller }) => {
  const labels = useLabels();
  const readOnly = useReadOnly(controller);
  const tone = calloutTone(block.attrs.tone);
  const icon = calloutIcon(block.attrs, tone);
  return (
    <div className={cn('quoin-callout group/callout flex items-start gap-2', TONE[tone])} data-tone={tone}>
      {readOnly ? (
        <span aria-hidden="true" className="flex size-6 items-center justify-center text-base">
          {icon}
        </span>
      ) : (
        <CalloutIconMenu blockId={block.id} controller={controller} icon={icon} />
      )}
      <EditableRegion
        block={block.id}
        region="body"
        label={labels.callout(labels.calloutTones[tone])}
        className="min-w-0 flex-1"
      />
      {!readOnly && <CalloutToneMenu blockId={block.id} controller={controller} tone={tone} />}
    </div>
  );
};
