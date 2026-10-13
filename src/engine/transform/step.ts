import type { BlockAttrs, EngineDoc, Inline, Pos } from '../model/types';

export type Assoc = -1 | 1;
export type PosMap = (pos: Pos, assoc?: Assoc) => Pos;
export type StepResult = { doc: EngineDoc; map: PosMap };
export type StepJSON = { readonly stepType: string } & Readonly<Record<string, unknown>>;

export interface Step {
  readonly stepType: string;
  apply(doc: EngineDoc): StepResult;
  invert(before: EngineDoc): Step;
  toJSON(): StepJSON;
}

export class StepError extends Error {}

export type CreatedBlock = {
  id: string;
  type: string;
  attrs: BlockAttrs;
  indent: number;
  region: string;
  regions?: Record<string, Inline>;
};

export const identityMap: PosMap = (pos) => pos;
