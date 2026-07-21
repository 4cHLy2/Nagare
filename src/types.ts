export interface NodeInput {
  id: string;
  label?: string;
  // hex override, else palette
  color?: string;
  // manual y override, fraction of canvas height (0=top, 1=bottom) of node center.
  // set by dragging on canvas; absent = let layout decide. normalized so it survives resizes
  y?: number;
}

export interface LinkInput {
  source: string;
  target: string;
  value: number;
  // hex override for this link, optional
  color?: string;
}

export interface SankeyModel {
  nodes: NodeInput[];
  links: LinkInput[];
}

export type LinkColorMode = 'gradient' | 'source' | 'target' | 'static';
export type NodeAlign = 'justify' | 'left' | 'right' | 'center';
// node order within a column
export type NodeSort = 'auto' | 'input' | 'ascending' | 'descending';
// denominator for percentage rendering
export type PercentBasis = 'total' | 'parent' | 'layer';

export interface Settings {
  paletteId: string;
  backgroundId: string;
  nodeWidth: number;
  nodePadding: number;
  nodeAlign: NodeAlign;
  nodeSort: NodeSort;
  percentBasis: PercentBasis;
  linkOpacity: number;
  linkColorMode: LinkColorMode;
  staticLinkColor: string;
  curvature: number;
  showLabels: boolean;
  showValues: boolean;
  showPercent: boolean;
  labelSize: number;
  nodeRadius: number;
  // ── value formatting ──
  numberFormat: 'currency' | 'plain';
  currency: string; // ISO 4217 code, e.g. 'EUR'
  locale: string; // e.g. 'de-DE'
  decimals: number;
  valueSuffix: string; // only used in 'plain' mode (e.g. 'kWh')
}

export type NumberFormat = Settings['numberFormat'];

// ── budget model (the source of truth the UI edits) ──────────────────
// canvas renders a sankey *derived* from this, users never wire nodes/links
// by hand. sources merge into net; net splits into categories; a category is
// either a lump amount or a sum of its items

export interface BudgetItem {
  id: string;
  label: string;
  amount: number;
  color?: string;
}

export interface BudgetCategory {
  id: string;
  label: string;
  color?: string;
  // only used when `items` is empty — lump category like Rent
  amount?: number;
  items: BudgetItem[];
}

export interface BudgetSource {
  id: string;
  label: string;
  amount: number;
  color?: string;
}

export interface Budget {
  sources: BudgetSource[];
  categories: BudgetCategory[];
  // overrides for the auto net node
  netLabel?: string;
  netColor?: string;
  // overrides for the auto remainder node
  unallocatedLabel?: string;
  unallocatedColor?: string;
  // drag positions by node id, normalized y 0..1
  positions?: Record<string, number>;
}

export interface Project {
  id: string;
  name: string;
  budget: Budget;
  settings: Settings;
  updatedAt: number;
}

export type Selection =
  | { kind: 'node'; id: string }
  | { kind: 'link'; source: string; target: string }
  | null;
