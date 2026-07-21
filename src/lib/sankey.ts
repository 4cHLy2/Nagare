import {
  sankey,
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify,
  type SankeyNode,
  type SankeyLink,
  type SankeyNodeMinimal,
} from 'd3-sankey';
import type { NodeAlign, NodeSort, SankeyModel, Settings } from '../types';

interface NodeExtra {
  id: string;
  label?: string;
  color?: string;
  // manual y override, fraction of height 0..1 — see NodeInput.y
  y?: number;
}
interface LinkExtra {
  color?: string;
}

export type LaidOutNode = SankeyNode<NodeExtra, LinkExtra>;
export type LaidOutLink = SankeyLink<NodeExtra, LinkExtra>;

export interface Layout {
  nodes: LaidOutNode[];
  links: LaidOutLink[];
}

const ALIGN = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify,
} as const;

// node order within a column. `auto` = don't call nodeSort, keep d3's crossing-
// minimising default. `input` pins model order (null). the value sorts get a comparator
type SortCmp = null | ((a: LaidOutNode, b: LaidOutNode) => number);
const SORT: Record<Exclude<NodeSort, 'auto'>, SortCmp> = {
  input: null,
  ascending: (a, b) => (a.value ?? 0) - (b.value ?? 0),
  descending: (a, b) => (b.value ?? 0) - (a.value ?? 0),
};

// runs the d3-sankey layout at a given canvas size.
// throws on bad input (missing node refs, cycles) — caller should catch
// and show the message instead of crashing the canvas
export function computeLayout(
  model: SankeyModel,
  width: number,
  height: number,
  settings: Settings,
  margin: { x: number; y: number } = { x: 8, y: 14 },
): Layout {
  // 0 links -> single column -> columns.length-1 === 0 -> d3 divides by zero -> NaN everywhere. bail
  if (!model.links.length) return { nodes: [], links: [] };

  const mx = Math.min(margin.x, width / 4);
  const my = Math.min(margin.y, height / 4);
  const generator = sankey<NodeExtra, LinkExtra>()
    .nodeId((d) => d.id)
    .nodeAlign(ALIGN[settings.nodeAlign as NodeAlign])
    .nodeWidth(settings.nodeWidth)
    .nodePadding(settings.nodePadding)
    .extent([
      [mx, my],
      [Math.max(mx + 1, width - mx), Math.max(my + 1, height - my)],
    ]);

  if (settings.nodeSort !== 'auto') generator.nodeSort(SORT[settings.nodeSort]);

  // d3 mutates its input, so clone every time
  const graph = generator({
    nodes: model.nodes.map((n) => ({ ...n })),
    links: model.links.map((l) => ({ ...l })),
  });

  // apply manual y overrides, then let d3 re-thread links to the moved nodes.
  // only overridden nodes move, everything else keeps its computed slot.
  // `y` is a normalized center — convert to px and clamp so it can't drag off-canvas
  const top = my;
  const bottom = Math.max(top + 1, height - my);
  let moved = false;
  for (const n of graph.nodes) {
    const yn = n.y;
    if (typeof yn !== 'number' || Number.isNaN(yn)) continue;
    const h = (n.y1 ?? 0) - (n.y0 ?? 0);
    let cy = top + Math.max(0, Math.min(1, yn)) * (bottom - top);
    cy = Math.max(top + h / 2, Math.min(bottom - h / 2, cy));
    n.y0 = cy - h / 2;
    n.y1 = cy + h / 2;
    moved = true;
  }
  if (moved) generator.update(graph);

  return { nodes: graph.nodes, links: graph.links };
}

const idOf = (n: SankeyNodeMinimal<NodeExtra, LinkExtra> | number | string): string =>
  typeof n === 'object' ? (n as NodeExtra).id : String(n);

export const linkSourceId = (l: LaidOutLink): string => idOf(l.source);
export const linkTargetId = (l: LaidOutLink): string => idOf(l.target);

// horizontal ribbon center-line, curvature 0 = flat, 1 = full S-bend
export function linkPath(l: LaidOutLink, curvature: number): string {
  const source = l.source as LaidOutNode;
  const target = l.target as LaidOutNode;
  const x0 = source.x1 ?? 0;
  const x1 = target.x0 ?? 0;
  const y0 = l.y0 ?? 0;
  const y1 = l.y1 ?? 0;
  const k = Math.max(0, Math.min(1, curvature));
  const xm = (x0 + x1) / 2;
  const cA = x0 + (xm - x0) * k; // k=1 -> midpoint (classic sankey), k=0 -> flat
  const cB = x1 + (xm - x1) * k;
  return `M${x0},${y0}C${cA},${y0} ${cB},${y1} ${x1},${y1}`;
}

// validate a model without running the full layout — cheap check for the editor
export function validateModel(model: SankeyModel): string | null {
  if (!Array.isArray(model.nodes) || !Array.isArray(model.links))
    return 'Model needs `nodes` and `links` arrays.';
  const ids = new Set<string>();
  for (const n of model.nodes) {
    if (!n.id) return 'Every node needs a non-empty `id`.';
    if (ids.has(n.id)) return `Duplicate node id: "${n.id}".`;
    ids.add(n.id);
  }
  for (const l of model.links) {
    if (!ids.has(l.source)) return `Link references unknown source: "${l.source}".`;
    if (!ids.has(l.target)) return `Link references unknown target: "${l.target}".`;
    if (l.source === l.target) return `Self-loop not allowed: "${l.source}".`;
    if (typeof l.value !== 'number' || !(l.value > 0))
      return `Link ${l.source} → ${l.target} needs a positive value.`;
  }
  return null;
}
