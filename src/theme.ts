import type { Settings } from './types';

export interface Palette {
  id: string;
  name: string;
  kanji: string;
  colors: string[];
}

// curated palettes — hardcoded hex so exports look right outside the app
export const PALETTES: Palette[] = [
  {
    id: 'finance',
    name: "Kin'yū",
    kanji: '金融',
    // income -> savings -> spending: green, teal, blue, amber, peach, red
    colors: ['#a6e3a1', '#94e2d5', '#89b4fa', '#f9e2af', '#fab387', '#f38ba8', '#eba0ac'],
  },
  {
    id: 'sumi',
    name: 'Sumi-e',
    kanji: '墨絵',
    colors: ['#cba6f7', '#b4befe', '#89b4fa', '#74c7ec', '#94e2d5', '#a6e3a1'],
  },
  {
    id: 'washi',
    name: 'Washi',
    kanji: '和紙',
    colors: ['#fab387', '#f5e0dc', '#f2cdcd', '#f9e2af', '#eba0ac', '#f5c2e7'],
  },
  {
    id: 'ukiyo',
    name: 'Ukiyo-e',
    kanji: '浮世絵',
    colors: ['#89b4fa', '#f38ba8', '#a6e3a1', '#f9e2af', '#94e2d5', '#cba6f7', '#fab387'],
  },
];

export interface Background {
  id: string;
  name: string;
  bg: string;
  // text color that reads well on this bg
  fg: string;
  // node/link stroke tint
  stroke: string;
}

export const BACKGROUNDS: Background[] = [
  { id: 'sumi-night', name: 'Sumi Night', bg: '#11111b', fg: '#cdd6f4', stroke: '#45475a' },
  { id: 'ink', name: 'Ink', bg: '#1e1e2e', fg: '#cdd6f4', stroke: '#45475a' },
  { id: 'washi', name: 'Washi', bg: '#f4ecd8', fg: '#3a3630', stroke: '#d8cdb0' },
  { id: 'paper', name: 'Paper', bg: '#faf7f0', fg: '#333333', stroke: '#e2dccf' },
];

export const paletteById = (id: string): Palette =>
  PALETTES.find((p) => p.id === id) ?? PALETTES[0];

// per-node color: explicit override wins, else palette color by list position.
// that's why switching palette recolors the whole diagram — nodes without an
// override just fall through. shared by canvas + budget editor so swatches match what's drawn
export function nodeColorMap(nodes: { id: string; color?: string }[], palette: Palette): Map<string, string> {
  const m = new Map<string, string>();
  nodes.forEach((n, i) => m.set(n.id, n.color ?? palette.colors[i % palette.colors.length]));
  return m;
}

export const backgroundById = (id: string): Background =>
  BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];

export const DEFAULT_SETTINGS: Settings = {
  paletteId: 'finance',
  backgroundId: 'sumi-night',
  nodeWidth: 16,
  nodePadding: 16,
  // 'left' keeps tiers honest: net (col 0) -> categories (col 1) -> items (col 2).
  // 'justify' shoves lump categories into the items column and tangles the flows
  nodeAlign: 'left',
  nodeSort: 'auto',
  percentBasis: 'total',
  linkOpacity: 0.45,
  linkColorMode: 'gradient',
  staticLinkColor: '#6c7086',
  curvature: 0.5,
  showLabels: true,
  showValues: true,
  showPercent: true,
  labelSize: 13,
  nodeRadius: 2,
  numberFormat: 'currency',
  currency: 'EUR',
  locale: 'de-DE',
  decimals: 0,
  valueSuffix: '',
};
