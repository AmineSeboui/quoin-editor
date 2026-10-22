import type { BlockChange } from '../engine/diff/block-change';
import type { EngineBlock, Inline } from '../engine/model/types';
import { inlineOf, type BlockRenderer, type BlockView, type HtmlEnv } from '../engine/render/html-env';
import { element, nodeText, type Attr, type HtmlNode } from '../engine/render/html-node';
import type { DiffLabels } from './diff-labels';
import { withEveryCell } from './table-grid';
import { wordNodes } from './word-nodes';

type Fill = { readonly words: ReadonlyMap<string, HtmlNode[]>; readonly names: ReadonlyMap<string, string> };

// Every region of the block is a placeholder, so none of its text meets one; private use characters keep an attribute
// from spelling one by chance.
const placeholder = (region: string) => `\ue000${region}\ue000`;

function filledAttr(attr: Attr, fill: Fill): Attr {
  const [name, value] = attr;
  return typeof value === 'string' && fill.names.has(value) ? [name, fill.names.get(value)] : attr;
}

function holdsPlaceholder(node: HtmlNode, placeholders: readonly string[], skip: ReadonlySet<HtmlNode>): boolean {
  const inText = (text: string) => placeholders.some((placeholder) => text.includes(placeholder));
  if (typeof node === 'string') return inText(node);
  if (skip.has(node)) return false;
  return (
    node.attrs.some(([, value]) => typeof value === 'string' && inText(value)) ||
    node.children.some((child) => holdsPlaceholder(child, placeholders, skip))
  );
}

function filled(node: HtmlNode, fill: Fill, skip: ReadonlySet<HtmlNode>): HtmlNode[] {
  if (typeof node === 'string') return fill.words.get(node) ?? [node];
  if (skip.has(node)) return [node];
  const children = node.children.flatMap((child) => filled(child, fill, skip));
  const attrs = node.attrs.map((attr) => filledAttr(attr, fill));
  const same = children.length === node.children.length && children.every((child, at) => child === node.children[at]);
  if (same && attrs.every((attr, at) => attr === node.attrs[at])) return [node];
  return [element(node.tag, attrs, children, node.html)];
}

/**
 * A changed block drawn by `render` with its words marked. Each region of either version is drawn as a placeholder,
 * which is then replaced by the region's word changes, and a name taken from the region, such as a checkbox's, by its
 * new text. A renderer that reads a region some other way leaves a placeholder behind, and the block is then drawn as
 * it is in the newer version, its whole text changed.
 */
export function changedNode(
  block: EngineBlock,
  view: BlockView,
  env: HtmlEnv,
  change: BlockChange,
  render: BlockRenderer,
  labels: DiffLabels,
): HtmlNode {
  const names = [...new Set([...Object.keys(block.regions), ...Object.keys(change.regions)])];
  const regions: Record<string, Inline> = Object.fromEntries(
    names.map((name) => [name, [{ kind: 'text', text: placeholder(name), marks: [] }]]),
  );
  const node = render(withEveryCell({ ...block, regions }, names), view, env);
  const changes = (name: string) => change.regions[name] ?? [{ op: 'equal' as const, inline: block.regions[name] }];
  const fill: Fill = {
    words: new Map(names.map((name) => [placeholder(name), wordNodes(changes(name), env, labels)])),
    names: new Map(names.map((name) => [placeholder(name), nodeText(inlineOf(block.regions[name], env)) || env.taskLabel])),
  };
  const skip = new Set(view.children);
  const [drawn] = filled(node, fill, skip);
  return holdsPlaceholder(drawn, names.map(placeholder), skip) ? render(block, view, env) : drawn;
}
