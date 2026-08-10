export interface NodeInput {
  id: string;
  label?: string;
  color?: string; // hex, else palette
  // 0..1, CENTER not top. normalized or resize scatters it
  y?: number;
}

export interface LinkInput {
  source: string;
  target: string;
  value: number;
  color?: string; // json tab only, no ui for it
}

export interface SankeyModel {
  nodes: NodeInput[];
  links: LinkInput[];
}

export type LinkColorMode = 'gradient' | 'source' | 'target' | 'static';
export type NodeAlign = 'justify' | 'left' | 'right' | 'center';
export type NodeSort = 'auto' | 'input' | 'ascending' | 'descending'; // order in a column
export type PercentBasis = 'total' | 'parent' | 'layer'; // denominator. ui says "column" for layer, never renamed

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

  // number stuff
  numberFormat: 'currency' | 'plain';
  currency: string; // iso 4217
  locale: string; // 'de-DE'. free text, expect junk
  decimals: number;
  valueSuffix: string; // plain mode only. kWh etc
}

export type NumberFormat = Settings['numberFormat'];

// the real model, everything derives from this
// sources -> net -> categories -> items
// category = lump OR items, never both

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
  amount?: number; // only if items empty. rent, insurance, that sort
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
  // net + unallocated arent real rows so their overrides sit here. ugly
  netLabel?: string;
  netColor?: string;
  unallocatedLabel?: string;
  unallocatedColor?: string;
  positions?: Record<string, number>; // id -> y 0..1
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
