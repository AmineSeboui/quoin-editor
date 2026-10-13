import { updateBlock } from '../model/doc';
import type { BlockAttrs } from '../model/types';
import { identityMap, StepError, type Step } from './step';
import { requireBlock } from './step-access';

export type AttrsPatch = Readonly<Record<string, unknown>>;

function patchAttrs(attrs: BlockAttrs, patch: AttrsPatch): BlockAttrs {
  const keys = new Set([...Object.keys(attrs), ...Object.keys(patch)]);
  return Object.fromEntries(
    [...keys]
      .filter((key) => !(Object.hasOwn(patch, key) && patch[key] === undefined))
      .map((key) => [key, Object.hasOwn(patch, key) ? patch[key] : attrs[key]]),
  );
}

function previousValues(attrs: BlockAttrs, patch: AttrsPatch): AttrsPatch {
  return Object.fromEntries(
    Object.keys(patch).map((key) => [key, Object.hasOwn(attrs, key) ? attrs[key] : undefined]),
  );
}

// JSON drops undefined, so a deleted key travels as a marker object.
function patchToJSON(patch: AttrsPatch): AttrsPatch {
  return Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [key, value === undefined ? { $delete: true } : value]),
  );
}

export function patchFromJSON(json: AttrsPatch): AttrsPatch {
  const isMarker = (value: unknown) =>
    typeof value === 'object' && value !== null && (value as { $delete?: unknown }).$delete === true;
  return Object.fromEntries(Object.entries(json).map(([key, value]) => [key, isMarker(value) ? undefined : value]));
}

export function setAttrsStep(block: string, patch: AttrsPatch): Step {
  return Object.freeze<Step>({
    stepType: 'setAttrs',
    apply(doc) {
      requireBlock(doc, block);
      return { doc: updateBlock(doc, block, (b) => ({ ...b, attrs: patchAttrs(b.attrs, patch) })), map: identityMap };
    },
    invert: (before) => setAttrsStep(block, previousValues(requireBlock(before, block).attrs, patch)),
    toJSON: () => ({ stepType: 'setAttrs', block, patch: patchToJSON(patch) }),
  });
}

export function setIndentStep(block: string, indent: number): Step {
  return Object.freeze<Step>({
    stepType: 'setIndent',
    apply(doc) {
      requireBlock(doc, block);
      if (!Number.isInteger(indent) || indent < 0) {
        throw new StepError(`indent ${indent} is not a non-negative integer`);
      }
      return { doc: updateBlock(doc, block, (b) => ({ ...b, indent })), map: identityMap };
    },
    invert: (before) => setIndentStep(block, requireBlock(before, block).indent),
    toJSON: () => ({ stepType: 'setIndent', block, indent }),
  });
}
