/** A document is an ordered array of these; `type` is looked up in the registered block definitions. */
export type QuoinBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  /** Nesting depth shared by every block type, such as list nesting and toggle children; 0 when absent. */
  indent?: number;
};
