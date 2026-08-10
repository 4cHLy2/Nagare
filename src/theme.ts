import type { Settings } from './types';

export interface Palette {
  id: string;
  name: string;
  kanji: string;
  colors: string[];
}

// hardcoded hex, no css vars. exports have to look right outside the app
export const PALETTES: Palette[] = [
  {
    id: 'finance',
    name: "Kin'yū",
    kanji: '金融',
    // green -> red, roughly income..spending. order matters, dont shuffle
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
  // {
  //   id: 'kohaku',
  //   name: 'Kohaku',
  //   kanji: '琥珀',
  //   colors: ['#f9e2af', '#fab387', '#eba0ac', '#f38ba8', '#e8a2af'],
  // },
];

export interface Background {
  id: string;
  name: string;
  bg: string;
  fg: string; // readable on that bg
  stroke: string; // nothing reads this anymore
}

export const BACKGROUNDS: Background[] = [
  { id: 'sumi-night', name: 'Sumi Night', bg: '#11111b', fg: '#cdd6f4', stroke: '#45475a' },
  { id: 'ink', name: 'Ink', bg: '#1e1e2e', fg: '#cdd6f4', stroke: '#45475a' },
  { id: 'washi', name: 'Washi', bg: '#f4ecd8', fg: '#3a3630', stroke: '#d8cdb0' },
  { id: 'paper', name: 'Paper', bg: '#faf7f0', fg: '#333333', stroke: '#e2dccf' },
];

export const paletteById = (id: string): Palette =>
  PALETTES.find((p) => p.id === id) ?? PALETTES[0];

// override wins, else palette by index. index! so inserting a node upstream
// shifts every colour after it. lived with it so far
// canvas + editor both call this, otherwise swatches lie
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
  // 'left' keeps the tiers honest. justify shoves lump categories into the
  // items column and it looks like spaghetti
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
