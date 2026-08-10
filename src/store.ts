import { create } from 'zustand';
import type { Budget, BudgetCategory, BudgetItem, BudgetSource, Project, SankeyModel, Selection, Settings } from './types';
import { DEFAULT_SETTINGS } from './theme';
import { SAMPLE_BUDGET } from './lib/sample';
import { NET_ID, UNALLOC_ID, dedupeBudgetIds, deriveModel, emptyBudget, migrateModelToBudget, uid } from './lib/budget';

// persist() rehydrated pre-budget shapes straight into state. by hand below
// import { persist } from 'zustand/middleware';

const PROJECTS_KEY = 'nagare.projects'; // saved list
const CURRENT_KEY = 'nagare.current'; // whatever was open last

// localStorage. thats the backend.

interface LegacyProject extends Omit<Project, 'budget'> {
  budget?: Budget;
  model?: SankeyModel; // pre-budget saves, still in peoples browsers
}

// migrate on read, never on write. everything out of storage goes through here
function normalizeProject(p: LegacyProject): Project {
  const budget = dedupeBudgetIds(p.budget ?? (p.model ? migrateModelToBudget(p.model) : emptyBudget()));
  return { id: p.id, name: p.name, budget, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) }, updatedAt: p.updatedAt };
}

function readProjects(): Project[] {
  try {
    return (JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? '[]') as LegacyProject[]).map(normalizeProject);
  } catch {
    return []; // corrupt storage -> pretend empty. beats a white screen
  }
}
function writeProjects(list: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
}
function readCurrent(): { budget: Budget; settings?: Settings; projectName?: string; projectId?: string } | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw) as { budget?: Budget; model?: SankeyModel; settings?: Settings; projectName?: string; projectId?: string };
    const budget = dedupeBudgetIds(doc.budget ?? (doc.model ? migrateModelToBudget(doc.model) : SAMPLE_BUDGET));
    return { budget, settings: doc.settings, projectName: doc.projectName, projectId: doc.projectId };
  } catch {
    return null;
  }
}

interface Snapshot {
  budget: Budget;
  settings: Settings;
}

interface StoreState extends Snapshot {
  // cached deriveModel(). re-derive EVERYWHERE budget changes, nothing subscribes
  model: SankeyModel;
  projectId: string;
  projectName: string;
  selection: Selection;
  past: Snapshot[];
  future: Snapshot[];

  // --- undoable ---
  setBudget: (budget: Budget) => void;
  addSource: () => void;
  updateSource: (id: string, patch: Partial<BudgetSource>) => void;
  removeSource: (id: string) => void;
  addCategory: () => string;
  updateCategory: (id: string, patch: Partial<Omit<BudgetCategory, 'items'>>) => void;
  removeCategory: (id: string) => void;
  addItem: (categoryId: string) => void;
  updateItem: (categoryId: string, itemId: string, patch: Partial<BudgetItem>) => void;
  removeItem: (categoryId: string, itemId: string) => void;
  setBudgetMeta: (patch: Pick<Budget, 'netLabel' | 'netColor' | 'unallocatedLabel' | 'unallocatedColor'>) => void;
  updateNodeStyle: (nodeId: string, patch: { label?: string; color?: string }) => void; // derived id -> hunts it down in the budget
  setNodePosition: (nodeId: string, y: number) => void;
  resetPositions: () => void;
  resetColors: () => void; // nuke colour overrides, back to palette

  // settings NOT undoable. ctrl+z should undo a budget edit, not a slider
  updateSettings: (patch: Partial<Settings>) => void;

  setSelection: (sel: Selection) => void;

  undo: () => void;
  redo: () => void;

  // projects
  newProject: () => void;
  saveProject: () => void;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  setProjectName: (name: string) => void;
  listProjects: () => Project[];
}

const snap = (s: Snapshot): Snapshot => ({ budget: s.budget, settings: s.settings });
// 60 is made up. structural sharing so its cheap, but unbounded + localStorage = no
const pushHistory = (s: StoreState) => ({ past: [...s.past, snap(s)].slice(-60), future: [] as Snapshot[] });
const persistCurrent = (s: StoreState) =>
  localStorage.setItem(
    CURRENT_KEY,
    JSON.stringify({ budget: s.budget, settings: s.settings, projectName: s.projectName, projectId: s.projectId }),
  );

const initial = readCurrent();

export const useStore = create<StoreState>((set, get) => {
  // ALL budget edits. snapshot -> apply -> re-derive -> persist
  const commit = (fn: (b: Budget) => Budget) =>
    set((s) => {
      const budget = fn(s.budget);
      const next = { ...s, ...pushHistory(s), budget, model: deriveModel(budget) };
      persistCurrent(next as StoreState);
      return next;
    });

  const initialBudget = initial?.budget ?? SAMPLE_BUDGET;

  return {
    budget: initialBudget,
    model: deriveModel(initialBudget),
    settings: { ...DEFAULT_SETTINGS, ...(initial?.settings ?? {}) },
    projectName: initial?.projectName ?? 'Untitled Flow',
    projectId: initial?.projectId ?? uid(),
    selection: null,
    past: [],
    future: [],

    setBudget: (budget) => commit(() => dedupeBudgetIds(budget)),

    addSource: () => commit((b) => ({ ...b, sources: [...b.sources, { id: uid(), label: 'Income', amount: 0 }] })),
    updateSource: (id, patch) =>
      commit((b) => ({ ...b, sources: b.sources.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
    removeSource: (id) => commit((b) => ({ ...b, sources: b.sources.filter((s) => s.id !== id) })),

    addCategory: () => {
      const id = uid();
      commit((b) => ({ ...b, categories: [...b.categories, { id, label: 'New category', amount: 0, items: [] }] }));
      return id;
    },
    updateCategory: (id, patch) =>
      commit((b) => ({ ...b, categories: b.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    removeCategory: (id) => commit((b) => ({ ...b, categories: b.categories.filter((c) => c.id !== id) })),

    addItem: (categoryId) =>
      commit((b) => ({
        ...b,
        categories: b.categories.map((c) =>
          c.id === categoryId ? { ...c, items: [...c.items, { id: uid(), label: 'New item', amount: 0 }] } : c,
        ),
      })),
    updateItem: (categoryId, itemId, patch) =>
      commit((b) => ({
        ...b,
        categories: b.categories.map((c) =>
          c.id === categoryId ? { ...c, items: c.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) } : c,
        ),
      })),
    removeItem: (categoryId, itemId) =>
      commit((b) => ({
        ...b,
        categories: b.categories.map((c) =>
          c.id === categoryId ? { ...c, items: c.items.filter((it) => it.id !== itemId) } : c,
        ),
      })),

    setBudgetMeta: (patch) => commit((b) => ({ ...b, ...patch })),

    updateNodeStyle: (nodeId, patch) =>
      commit((b) => {
        if (nodeId === NET_ID)
          return { ...b, netLabel: patch.label ?? b.netLabel, netColor: patch.color ?? b.netColor };
        if (nodeId === UNALLOC_ID)
          return { ...b, unallocatedLabel: patch.label ?? b.unallocatedLabel, unallocatedColor: patch.color ?? b.unallocatedColor };
        return {
          ...b,
          sources: b.sources.map((s) => (s.id === nodeId ? { ...s, ...patch } : s)),
          categories: b.categories.map((c) =>
            c.id === nodeId
              ? { ...c, ...patch }
              : { ...c, items: c.items.map((it) => (it.id === nodeId ? { ...it, ...patch } : it)) },
          ),
        };
      }),

    // no history. 200 undos of "moved 3px" is useless
    setNodePosition: (nodeId, y) =>
      set((s) => {
        const budget = { ...s.budget, positions: { ...(s.budget.positions ?? {}), [nodeId]: y } };
        const next = { ...s, budget, model: deriveModel(budget) };
        persistCurrent(next as StoreState);
        return next;
      }),
    resetPositions: () =>
      commit((b) => {
        if (!b.positions || Object.keys(b.positions).length === 0) return b;
        const { positions: _drop, ...rest } = b;
        return rest;
      }),

    // rebuild by hand, not color:undefined. want the key GONE in exports
    resetColors: () =>
      commit((b) => ({
        ...b,
        netColor: undefined,
        unallocatedColor: undefined,
        sources: b.sources.map((s) => ({ id: s.id, label: s.label, amount: s.amount })),
        categories: b.categories.map((c) => ({
          id: c.id,
          label: c.label,
          amount: c.amount,
          items: c.items.map((it) => ({ id: it.id, label: it.label, amount: it.amount })),
        })),
      })),

    updateSettings: (patch) =>
      set((s) => {
        const next = { ...s, settings: { ...s.settings, ...patch } };
        persistCurrent(next as StoreState);
        return next;
      }),

    setSelection: (selection) => set({ selection }),

    undo: () =>
      set((s) => {
        if (s.past.length === 0) return s;
        const prev = s.past[s.past.length - 1];
        const next = {
          ...s,
          budget: prev.budget,
          settings: prev.settings,
          model: deriveModel(prev.budget),
          past: s.past.slice(0, -1),
          future: [snap(s), ...s.future].slice(0, 60),
        };
        persistCurrent(next as StoreState);
        return next;
      }),

    redo: () =>
      set((s) => {
        if (s.future.length === 0) return s;
        const nextSnap = s.future[0];
        const next = {
          ...s,
          budget: nextSnap.budget,
          settings: nextSnap.settings,
          model: deriveModel(nextSnap.budget),
          past: [...s.past, snap(s)].slice(-60),
          future: s.future.slice(1),
        };
        persistCurrent(next as StoreState);
        return next;
      }),

    newProject: () =>
      set((s) => {
        const budget = emptyBudget();
        const next = {
          ...s,
          budget,
          model: deriveModel(budget),
          settings: DEFAULT_SETTINGS,
          projectName: 'Untitled Flow',
          projectId: uid(),
          selection: null,
          past: [],
          future: [],
        };
        persistCurrent(next as StoreState);
        return next;
      }),

    // upsert by id. save twice = 1 entry not 2
    saveProject: () => {
      const s = get();
      const list = readProjects();
      const project: Project = { id: s.projectId, name: s.projectName, budget: s.budget, settings: s.settings, updatedAt: Date.now() };
      const idx = list.findIndex((p) => p.id === s.projectId);
      if (idx >= 0) list[idx] = project;
      else list.push(project);
      writeProjects(list);
    },

    loadProject: (id) =>
      set((s) => {
        const project = readProjects().find((p) => p.id === id);
        if (!project) return s;
        const next = {
          ...s,
          budget: project.budget,
          model: deriveModel(project.budget),
          settings: { ...DEFAULT_SETTINGS, ...project.settings },
          projectName: project.name,
          projectId: project.id,
          selection: null,
          past: [],
          future: [],
        };
        persistCurrent(next as StoreState);
        return next;
      }),

    deleteProject: (id) => {
      writeProjects(readProjects().filter((p) => p.id !== id));
      // HACK, list lives in localStorage not state. kick zustand
      set((s) => ({ ...s }));
    },

    setProjectName: (projectName) =>
      set((s) => {
        const next = { ...s, projectName };
        persistCurrent(next as StoreState);
        return next;
      }),

    listProjects: () => readProjects().sort((a, b) => b.updatedAt - a.updatedAt),
  };
});
