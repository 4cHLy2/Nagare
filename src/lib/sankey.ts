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

// my fields. d3 bolts x0/x1/y0/y1/value onto these after layout
interface NodeExtra {
  id: string;
  label?: string;
  color?: string;
  y?: number; // MY drag override 0..1, not d3's y. see NodeInput.y
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

// d3 api is weird. no nodeSort() call = auto, nodeSort(null) = my order
// so auto cant live in here, its the absence of a call. see the if below
type SortCmp = null | ((a: LaidOutNode, b: LaidOutNode) => number);
const SORT: Record<Exclude<NodeSort, 'auto'>, SortCmp> = {
  input: null,
  ascending: (a, b) => (a.value ?? 0) - (b.value ?? 0),
  descending: (a, b) => (b.value ?? 0) - (a.value ?? 0),
};

// THROWS on bad refs / cycles. canvas catches + paints the msg
export function computeLayout(
  model: SankeyModel,
  width: number,
  height: number,
  settings: Settings,
  margin: { x: number; y: number } = { x: 8, y: 14 },
): Layout {
  // DONT REMOVE. 0 links -> d3 divides by 0 -> NaN everywhere, blank svg, no error
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

  // clone every time, d3 mutates. otherwise the store fills up with x0/y0 junk
  const graph = generator({
    nodes: model.nodes.map((n) => ({ ...n })),
    links: model.links.map((l) => ({ ...l })),
  });

  // move the dragged ones, update() re-threads the ribbons
  // clamp or a node goes off canvas and is gone for good
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

// ribbon centre line, stroke-width does the rest
// d3s linkHorizontal is stuck at k=1, wanted flatter
// import { sankeyLinkHorizontal } from 'd3-sankey';
// export const linkPath = sankeyLinkHorizontal<NodeExtra, LinkExtra>();
export function linkPath(l: LaidOutLink, curvature: number): string {
  const source = l.source as LaidOutNode;
  const target = l.target as LaidOutNode;
  const x0 = source.x1 ?? 0;
  const x1 = target.x0 ?? 0;
  const y0 = l.y0 ?? 0;
  const y1 = l.y1 ?? 0;
  const k = Math.max(0, Math.min(1, curvature));
  const xm = (x0 + x1) / 2;
  const cA = x0 + (xm - x0) * k; // k=1 -> ctrl pts at midpoint, classic S
  const cB = x1 + (xm - x1) * k; // k=0 -> ctrl pts on the ends, flat
  return `M${x0},${y0}C${cA},${y0} ${cB},${y1} ${x1},${y1}`;
}

// dead, validateBudget does this now
// TODO hook into import or bin it
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
