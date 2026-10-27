import fc from "fast-check";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { text as textNode } from "../engine/model/inline";
import { sameDoc } from "../engine/model/same-doc";
import type { EngineDoc } from "../engine/model/types";
import { writeBlocks } from "./doc-shape";
import { readItems, readShared } from "./read-shared";
import type { RequiredRegions } from "./required-regions";
import { layoutShape } from "./test-support/layout-shape";
import { readRemote } from "./yjs-to-steps";

type Op = { insert: unknown; attributes?: Record<string, unknown> };

const edit = fc.record({
  kind: fc.constantFrom(
    "text",
    "embed",
    "marker",
    "format",
    "unformat",
    "delete",
  ),
  at: fc.nat(40),
  length: fc.integer({ min: 1, max: 4 }),
  bold: fc.boolean(),
});

// Strings in a row with the same formatting as one, and no formatting as none, so both readings can be compared.
function normalized(ops: readonly Op[], maps: Map<unknown, number>): unknown[] {
  const out: { insert: unknown; attributes?: Record<string, unknown> }[] = [];
  for (const { insert, attributes } of ops) {
    const attrs =
      attributes && Object.keys(attributes).length > 0 ? attributes : undefined;
    const last = out[out.length - 1];
    const plain =
      insert instanceof Y.Map
        ? `map${maps.get(insert) ?? maps.set(insert, maps.size).size - 1}`
        : insert;
    if (
      typeof plain === "string" &&
      typeof last?.insert === "string" &&
      !(insert instanceof Y.Map)
    ) {
      if (JSON.stringify(last.attributes) === JSON.stringify(attrs)) {
        last.insert += plain;
        continue;
      }
    }
    out.push(attrs ? { insert: plain, attributes: attrs } : { insert: plain });
  }
  return out;
}

describe("reading the items of a shared text", () => {
  it("gives what Y.Text.toDelta gives for anything the Y.Text API writes", () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(edit, { minLength: 1, maxLength: 4 }), {
          maxLength: 8,
        }),
        fc.boolean(),
        (rounds, gc) => {
          // Without garbage collection, deleted items keep their content, as they do for a snapshot or an undo.
          const doc = new Y.Doc({ gc });
          doc.clientID = 1;
          const text = doc.getText("quoin");
          for (const round of rounds) {
            doc.transact(() => {
              for (const { kind, at, length, bold } of round) {
                const place = Math.min(at, text.length);
                const span = Math.min(length, text.length - place);
                const attributes = bold ? { bold: true } : {};
                if (kind === "text")
                  text.insert(place, "abcd".slice(0, length), attributes);
                else if (kind === "embed")
                  text.insertEmbed(place, { r: "text" }, attributes);
                else if (kind === "marker")
                  text.insertEmbed(
                    place,
                    new Y.Map([["id", `m${at}`]]),
                    attributes,
                  );
                else if (kind === "format")
                  text.format(place, span, { bold: true, code: bold || null });
                else if (kind === "unformat")
                  text.format(place, span, { bold: null });
                else text.delete(place, span);
              }
            });
          }
          const walked: Op[] = [];
          const sink = { read: (op: Op) => walked.push(op) };
          readItems(text, () => sink, sink);
          const maps = new Map<unknown, number>();
          expect(normalized(walked, maps)).toEqual(
            normalized(text.toDelta() as Op[], maps),
          );
        },
      ),
      { seed: 20261027, numRuns: 500 },
    );
  });

  it("reads content the Y.Text API never writes the same way for one block as for the whole text", () => {
    const required: RequiredRegions = (type) =>
      type === "MARKDOWN" ? ["text"] : type === "TWO" ? ["text", "body"] : [];
    const one = new Y.Doc();
    one.clientID = 1;
    const text = one.getText("quoin");
    writeBlocks(text, 0, [
      {
        id: "p",
        type: "MARKDOWN",
        indent: 0,
        attrs: {},
        regions: { text: [textNode("abc")] },
      },
      {
        id: "q",
        type: "MARKDOWN",
        indent: 0,
        attrs: {},
        regions: { text: [textNode("def")] },
      },
    ]);
    const before = readShared(text, required);
    const shared = { text, layout: before.layout, stale: false, required };
    let after: EngineDoc = before.doc;
    text.observeDeep((events) => {
      after = readRemote(shared, events, after).steps.reduce(
        (doc, step) => step.apply(doc).doc,
        after,
      );
    });
    const other = new Y.Doc();
    other.clientID = 2;
    Y.applyUpdate(other, Y.encodeStateAsUpdate(one));
    const known = Y.encodeStateVector(other);
    other.transact(() => {
      other.getArray("quoin").insert(3, [42, 43]);
      (other.getArray("quoin").get(0) as Y.Map<unknown>).set("type", "TWO");
    });
    Y.applyUpdate(one, Y.encodeStateAsUpdate(other, known));
    const fresh = readShared(text, required);
    expect(sameDoc(after, fresh.doc)).toBe(true);
    expect(layoutShape(shared.layout)).toEqual(layoutShape(fresh.layout));
    expect(fresh.layout.spans.reduce((sum, span) => sum + span.length, 0)).toBe(
      text.length,
    );
  });
});
