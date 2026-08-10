import type { Budget, BudgetCategory, NodeInput, LinkInput, SankeyModel } from '../types';

// reserved, see dedupeBudgetIds
export const NET_ID = 'net';
export const UNALLOC_ID = 'unallocated';

// 8 chars, only needs to be unique in one budget
// fallback for old safari / non-https, no randomUUID
export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : `id-${Math.floor(Math.random() * 1e9).toString(36)}`;

// items win over amount, always
export const categoryValue = (c: BudgetCategory): number =>
  c.items.length > 0 ? c.items.reduce((s, i) => s + (i.amount || 0), 0) : c.amount || 0;

export const netTotal = (b: Budget): number => b.sources.reduce((s, x) => s + (x.amount || 0), 0);
export const allocated = (b: Budget): number => b.categories.reduce((s, c) => s + categoryValue(c), 0);
export const remainder = (b: Budget): number => netTotal(b) - allocated(b); // <0 means overspent

// budget -> {nodes,links}. the whole engine such as it is
//   1 source  = that source IS net, no pointless hop
//   2+        = merge into net
//   leftovers -> unallocated so it always balances
// <=0 dropped, d3 wants positives and stays quiet about it
export function deriveModel(b: Budget): SankeyModel {
  const nodes: NodeInput[] = [];
  const links: LinkInput[] = [];
  const pos = b.positions ?? {};
  const push = (n: NodeInput) => nodes.push(pos[n.id] !== undefined ? { ...n, y: pos[n.id] } : n);

  const sources = b.sources ?? [];
  const single = sources.length <= 1;

  // leave color undefined!! default here = palette switcher dies silently
  if (single) {
    const s0 = sources[0];
    push({ id: NET_ID, label: b.netLabel || s0?.label || 'Net Income', color: b.netColor });
  } else {
    for (const s of sources) {
      push({ id: s.id, label: s.label || 'Income', color: s.color });
      if ((s.amount || 0) > 0) links.push({ source: s.id, target: NET_ID, value: s.amount });
    }
    push({ id: NET_ID, label: b.netLabel || 'Net Income', color: b.netColor });
  }

  for (const c of b.categories) {
    const val = categoryValue(c);
    if (val <= 0) continue;
    push({ id: c.id, label: c.label || 'Category', color: c.color });
    links.push({ source: NET_ID, target: c.id, value: val });
    if (c.items.length > 0) {
      for (const it of c.items) {
        if ((it.amount || 0) <= 0) continue;
        push({ id: it.id, label: it.label || 'Item', color: it.color });
        links.push({ source: c.id, target: it.id, value: it.amount });
      }
    }
  }

  const left = remainder(b);
  if (left > 0.005) {
    // .005 not 0, float noise. 2799.9999999999995 isnt leftover money
    push({ id: UNALLOC_ID, label: b.unallocatedLabel || 'Unallocated', color: b.unallocatedColor });
    links.push({ source: NET_ID, target: UNALLOC_ID, value: left });
  }

  return { nodes, links };
}

// shape check for json tab + import. msg or null. not a real validator
export function validateBudget(b: unknown): string | null {
  if (!b || typeof b !== 'object') return 'Budget must be an object.';
  const bud = b as Budget;
  if (!Array.isArray(bud.sources)) return 'Budget needs a `sources` array.';
  if (!Array.isArray(bud.categories)) return 'Budget needs a `categories` array.';
  const ids = new Set<string>([NET_ID, UNALLOC_ID]);
  const seen = (id: string, what: string): string | null => {
    if (!id) return `Every ${what} needs a non-empty id.`;
    if (ids.has(id)) return `Duplicate id "${id}" (${what}). Ids must be unique.`;
    ids.add(id);
    return null;
  };
  for (const s of bud.sources) {
    const e = seen(s.id, 'source');
    if (e) return e;
    if (typeof s.amount !== 'number' || s.amount < 0) return `Source "${s.label ?? s.id}" needs a non-negative amount.`;
  }
  for (const c of bud.categories) {
    const e = seen(c.id, 'category');
    if (e) return e;
    if (!Array.isArray(c.items)) return `Category "${c.label ?? c.id}" needs an \`items\` array (may be empty).`;
    if (c.items.length === 0 && (typeof c.amount !== 'number' || c.amount < 0))
      return `Category "${c.label ?? c.id}" needs a non-negative amount (it has no items).`;
    for (const it of c.items) {
      const ie = seen(it.id, 'item');
      if (ie) return ie;
      if (typeof it.amount !== 'number' || it.amount < 0) return `Item "${it.label ?? it.id}" needs a non-negative amount.`;
    }
  }
  return null;
}

// old {nodes,links} -> budget. best effort
// fattest root = net, kids = categories, grandkids = items, deeper = binned
export function migrateModelToBudget(model: SankeyModel): Budget {
  const nodes = model?.nodes ?? [];
  const links = model?.links ?? [];
  if (nodes.length === 0) return emptyBudget();

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outflow = new Map<string, number>();
  const inflow = new Map<string, number>();
  const children = new Map<string, { id: string; value: number }[]>();
  for (const l of links) {
    if (!byId.has(l.source) || !byId.has(l.target)) continue;
    outflow.set(l.source, (outflow.get(l.source) ?? 0) + l.value);
    inflow.set(l.target, (inflow.get(l.target) ?? 0) + l.value);
    // get-or-create in one go. horrible. set() returns the map so the 2nd get cant miss
    (children.get(l.source) ?? children.set(l.source, []).get(l.source)!).push({ id: l.target, value: l.value });
  }

  const roots = nodes.filter((n) => !(inflow.get(n.id) ?? 0));
  const net = roots.sort((a, b) => (outflow.get(b.id) ?? 0) - (outflow.get(a.id) ?? 0))[0] ?? nodes[0];

  const label = (id: string) => byId.get(id)?.label || id;
  const color = (id: string) => byId.get(id)?.color;

  const categories: BudgetCategory[] = (children.get(net.id) ?? []).map((c) => {
    const kids = children.get(c.id) ?? [];
    return {
      id: c.id,
      label: label(c.id),
      color: color(c.id),
      amount: kids.length ? undefined : c.value,
      items: kids.map((k) => ({ id: k.id, label: label(k.id), amount: k.value, color: color(k.id) })),
    };
  });

  return {
    sources: [{ id: uid(), label: label(net.id), amount: outflow.get(net.id) ?? 0, color: color(net.id) }],
    categories,
  };
}

export const emptyBudget = (): Budget => ({
  sources: [{ id: uid(), label: 'Net Income', amount: 0 }],
  categories: [],
});

// dupe ids. what a day that was.
// d3-sankey silently MERGES same-id nodes -> half the diagram vanishes
// everything from outside goes through here. dupe/empty -> new uid
export function dedupeBudgetIds(b: Budget): Budget {
  const used = new Set<string>([NET_ID, UNALLOC_ID]);
  let changed = false;
  const fix = (id: string): string => {
    if (id && !used.has(id)) {
      used.add(id);
      return id;
    }
    let nid = uid();
    while (used.has(nid)) nid = uid();
    used.add(nid);
    changed = true;
    return nid;
  };
  const sources = b.sources.map((s) => {
    const id = fix(s.id);
    return id === s.id ? s : { ...s, id };
  });
  const categories = b.categories.map((c) => {
    const id = fix(c.id);
    const items = c.items.map((it) => {
      const iid = fix(it.id);
      return iid === it.id ? it : { ...it, id: iid };
    });
    const itemsChanged = items.some((it, i) => it !== c.items[i]);
    return id === c.id && !itemsChanged ? c : { ...c, id, items };
  });
  return changed ? { ...b, sources, categories } : b;
}
