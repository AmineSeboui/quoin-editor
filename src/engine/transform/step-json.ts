import { createDoc } from '../model/doc';
import { isRecord } from '../model/is-record';
import type { EngineBlock, EngineDoc, Inline, Mark } from '../model/types';
import { patchFromJSON, setAttrsStep, setIndentStep } from './attrs-steps';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep, replaceBlockStep } from './block-steps';
import { addMarkStep, removeMarkStep } from './mark-steps';
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
  const read = <T>(key: string, accept: (value: unknown) => value is T): T => {
    const value = json[key];
    if (!accept(value)) throw new StepError(`invalid "${key}" in a ${json.stepType} step`);
    return value;
  };
  return {
    string: (key: string) => read(key, isString),
    integer: (key: string) => read(key, isInteger),
    inline: (key: string) => read(key, isInline),
    record: (key: string) => read(key, isRecord),
    mark: (key: string) => read(key, isMark),
    markOrType: (key: string) => read(key, isMarkOrType),
    block: (key: string) => read(key, isBlock),
    blocks: (key: string) => read(key, areBlocks),
    created: (key: string) => read(key, isCreated),
  };
}

export function stepFromJSON(json: StepJSON): Step {
  const get = reader(json);
  switch (json.stepType) {
    case 'replaceInline':
      return replaceInlineStep(
        get.string('block'),
        get.string('region'),
        get.integer('from'),
        get.integer('to'),
        get.inline('slice'),
      );
    case 'addMark':
      return addMarkStep(
        get.string('block'),
        get.string('region'),
        get.integer('from'),
        get.integer('to'),
        get.mark('mark'),
      );
    case 'removeMark':
      return removeMarkStep(
        get.string('block'),
        get.string('region'),
        get.integer('from'),
        get.integer('to'),
        get.markOrType('mark'),
      );
    case 'setAttrs':
      return setAttrsStep(get.string('block'), patchFromJSON(get.record('patch')));
    case 'setIndent':
      return setIndentStep(get.string('block'), get.integer('indent'));
    case 'insertBlocks':
      return insertBlocksStep(get.integer('index'), get.blocks('blocks'));
    case 'removeBlocks':
      return removeBlocksStep(get.integer('index'), get.integer('count'));
    case 'moveBlocks':
      return moveBlocksStep(get.integer('from'), get.integer('count'), get.integer('to'));
    case 'replaceBlock':
      return replaceBlockStep(get.block('block'));
    case 'replaceDoc':
      return replaceDocStep(docOf(get.blocks('blocks')));
    case 'splitBlock':
      return splitBlockStep(get.string('block'), get.string('region'), get.integer('offset'), get.created('created'));
    case 'joinBlocks':
      return joinBlocksStep(
        get.string('target'),
        get.string('targetRegion'),
        get.string('source'),
        get.string('sourceRegion'),
      );
    default:
      throw new StepError(`unknown step type "${json.stepType}"`);
  }
}
