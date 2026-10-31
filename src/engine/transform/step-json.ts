import { createDoc } from '../model/doc';
import { isRecord } from '../model/is-record';
import type { EngineBlock, EngineDoc, Inline, Mark } from '../model/types';
import { patchFromJSON, setAttrsStep, setIndentStep } from './attrs-steps';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep, replaceBlockStep } from './block-steps';
import { addMarkStep, removeMarkStep, restoreMarksStep } from './mark-steps';
import { replaceDocStep } from './replace-doc-step';
import { replaceInlineStep } from './replace-inline-step';
import { joinBlocksStep, splitBlockStep } from './split-join-steps';
import { StepError, type CreatedBlock, type Step, type StepJSON } from './step';

type JSONRecord = Record<string, unknown>;

const isRegions = (value: unknown): value is Record<string, Inline> =>
  isRecord(value) && Object.values(value).every(Array.isArray);
const isMark = (value: unknown): value is Mark =>
  isRecord(value) && typeof value.type === 'string' && (value.attrs === undefined || isRecord(value.attrs));
const isBlockShape = (value: unknown): value is JSONRecord =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.type === 'string' &&
  Number.isInteger(value.indent) &&
  isRecord(value.attrs);
const isBlock = (value: unknown): value is EngineBlock => isBlockShape(value) && isRegions(value.regions);
const isCreated = (value: unknown): value is CreatedBlock =>
  isBlockShape(value) && typeof value.region === 'string' && (value.regions === undefined || isRegions(value.regions));
const isString = (value: unknown): value is string => typeof value === 'string';
const isInteger = (value: unknown): value is number => Number.isInteger(value);
const isInline = (value: unknown): value is Inline => Array.isArray(value);
const isMarkOrType = (value: unknown): value is Mark | string => isString(value) || isMark(value);
const areBlocks = (value: unknown): value is EngineBlock[] => Array.isArray(value) && value.every(isBlock);

function docOf(blocks: EngineBlock[]): EngineDoc {
  if (new Set(blocks.map((block) => block.id)).size !== blocks.length) {
    throw new StepError('a replaceDoc step repeats a block id');
  }
  return createDoc(blocks);
}

function reader(json: StepJSON) {
  return <T>(key: string, accept: (value: unknown) => value is T): T => {
    const value = json[key];
    if (!accept(value)) throw new StepError(`invalid "${key}" in a ${json.stepType} step`);
    return value;
  };
}

export function stepFromJSON(json: StepJSON): Step {
  const read = reader(json);
  switch (json.stepType) {
    case 'replaceInline':
      return replaceInlineStep(
        read('block', isString),
        read('region', isString),
        read('from', isInteger),
        read('to', isInteger),
        read('slice', isInline),
      );
    case 'addMark':
      return addMarkStep(
        read('block', isString),
        read('region', isString),
        read('from', isInteger),
        read('to', isInteger),
        read('mark', isMark),
      );
    case 'removeMark':
      return removeMarkStep(
        read('block', isString),
        read('region', isString),
        read('from', isInteger),
        read('to', isInteger),
        read('mark', isMarkOrType),
      );
    case 'restoreMarks':
      return restoreMarksStep(
        read('block', isString),
        read('region', isString),
        read('from', isInteger),
        read('to', isInteger),
        read('slice', isInline),
      );
    case 'setAttrs':
      return setAttrsStep(read('block', isString), patchFromJSON(read('patch', isRecord)));
    case 'setIndent':
      return setIndentStep(read('block', isString), read('indent', isInteger));
    case 'insertBlocks':
      return insertBlocksStep(read('index', isInteger), read('blocks', areBlocks));
    case 'removeBlocks':
      return removeBlocksStep(read('index', isInteger), read('count', isInteger));
    case 'moveBlocks':
      return moveBlocksStep(read('from', isInteger), read('count', isInteger), read('to', isInteger));
    case 'replaceBlock':
      return replaceBlockStep(read('block', isBlock));
    case 'replaceDoc':
      return replaceDocStep(docOf(read('blocks', areBlocks)));
    case 'splitBlock':
      return splitBlockStep(
        read('block', isString),
        read('region', isString),
        read('offset', isInteger),
        read('created', isCreated),
      );
    case 'joinBlocks':
      return joinBlocksStep(
        read('target', isString),
        read('targetRegion', isString),
        read('source', isString),
        read('sourceRegion', isString),
      );
    default:
      throw new StepError(`unknown step type "${json.stepType}"`);
  }
}
