import type { EngineDoc, Mark, Pos, Selection } from '../model/types';
import { StepError, type Assoc, type PosMap, type Step } from '../transform/step';
import type { EditorState } from './editor-state';
import { mapSelection } from './selection';

export type TransactionOrigin = 'input' | 'command' | 'paste' | 'drop' | 'remote' | 'reconcile' | 'ai' | 'history';

/** Where a change was not made by this editor's user: kept out of the history and never filtered. */
export const foreignOrigins: readonly TransactionOrigin[] = ['remote', 'reconcile', 'history'];

/** The meta of a transaction no extension may filter, such as the undo of an input rule. */
export const UNFILTERED = 'unfiltered';

export class Transaction {
  readonly before: EditorState;
  readonly time: number;
  private currentDoc: EngineDoc;
  private currentSelection: Selection | null;
  private currentStoredMarks: readonly Mark[] | null;
  private selectionWasSet = false;
  private storedMarksWereSet = false;
  private readonly stepList: Step[] = [];
  private readonly docList: EngineDoc[] = [];
  private readonly mapList: PosMap[] = [];
  private readonly metaValues = new Map<string, unknown>();

  constructor(state: EditorState, time: number = state.clock()) {
    this.before = state;
    this.time = time;
    this.currentDoc = state.doc;
    this.currentSelection = state.selection;
    this.currentStoredMarks = state.storedMarks;
  }

  get doc(): EngineDoc {
    return this.currentDoc;
  }

  get docs(): readonly EngineDoc[] {
    return this.docList;
  }

  get steps(): readonly Step[] {
    return this.stepList;
  }

  get maps(): readonly PosMap[] {
    return this.mapList;
  }

  get docChanged(): boolean {
    return this.stepList.length > 0;
  }

  get selection(): Selection | null {
    return this.currentSelection;
  }

  get selectionSet(): boolean {
    return this.selectionWasSet;
  }

  get storedMarks(): readonly Mark[] | null {
    return this.currentStoredMarks;
  }

  get storedMarksSet(): boolean {
    return this.storedMarksWereSet;
  }

  get meta(): ReadonlyMap<string, unknown> {
    return this.metaValues;
  }

  get origin(): TransactionOrigin {
    return this.getMeta<TransactionOrigin>('origin') ?? 'command';
  }

  get addToHistory(): boolean {
    return this.getMeta<boolean>('addToHistory') !== false;
  }

  step(step: Step): this {
    const { doc, map } = step.apply(this.currentDoc);
    if (this.currentSelection !== null) {
      this.currentSelection = mapSelection(this.currentSelection, map, this.currentDoc);
    }
    this.docList.push(this.currentDoc);
    this.stepList.push(step);
    this.mapList.push(map);
    this.currentDoc = doc;
    return this;
  }

  maybeStep(step: Step): boolean {
    try {
      this.step(step);
      return true;
    } catch (error) {
      if (error instanceof StepError) return false;
      throw error;
    }
  }

  setSelection(selection: Selection | null): this {
    this.currentSelection = selection;
    this.selectionWasSet = true;
    return this;
  }

  setStoredMarks(marks: readonly Mark[] | null): this {
    this.currentStoredMarks = marks;
    this.storedMarksWereSet = true;
    return this;
  }

  setOrigin(origin: TransactionOrigin): this {
    return this.setMeta('origin', origin);
  }

  setMeta(key: string, value: unknown): this {
    this.metaValues.set(key, value);
    return this;
  }

  getMeta<T>(key: string): T | undefined {
    return this.metaValues.get(key) as T | undefined;
  }

  mapPos(pos: Pos, assoc: Assoc = 1, fromStep = 0): Pos {
    let mapped = pos;
    for (let i = fromStep; i < this.mapList.length; i++) mapped = this.mapList[i](mapped, assoc);
    return mapped;
  }
}
