import { useRef, useState, type RefObject } from 'react';
import { useStore } from '../store';
import type { CanvasHandle } from './SankeyCanvas';
import { exportJSON, exportPNG, exportSVG } from '../lib/export';
import { migrateModelToBudget, validateBudget } from '../lib/budget';
import { BUDGET_EXAMPLES } from '../lib/sample';
import type { Budget, SankeyModel, Settings } from '../types';
import {
  Undo2, Redo2, Save, FolderOpen, Download, Upload, FilePlus2, ChevronDown, Image, FileCode, Braces, Sparkles,
} from 'lucide-react';

interface Props {
  canvasRef: RefObject<CanvasHandle | null>;
  onOpenProjects: () => void;
}

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'nagare';

export default function TopBar({ canvasRef, onOpenProjects }: Props) {
  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  const budget = useStore((s) => s.budget);
  const settings = useStore((s) => s.settings);
  const setBudget = useStore((s) => s.setBudget);
  const updateSettings = useStore((s) => s.updateSettings);
  const saveProject = useStore((s) => s.saveProject);
  const newProject = useStore((s) => s.newProject);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const past = useStore((s) => s.past.length);
  const future = useStore((s) => s.future.length);

  const [exportOpen, setExportOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doSave = () => {
    saveProject();
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  const withSvg = (fn: (svg: SVGSVGElement) => void) => {
    const svg = canvasRef.current?.getSvg();
    if (svg) fn(svg);
    setExportOpen(false);
  };

  const flashImported = () => {
    setImported(true);
    setTimeout(() => setImported(false), 1400);
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ''; // clear up front so the same file can be re-imported later
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => alert('Could not read that file.');
    reader.onload = () => {
      let parsed: Partial<Budget & SankeyModel> & { budget?: Budget; settings?: Settings; name?: string };
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (err) {
        alert(`Could not parse JSON: ${(err as Error).message}`);
        return;
      }
      const bud = parsed.budget ?? parsed; // accept a bare budget or a full { name, budget, settings } project
      if (Array.isArray(bud.sources) && Array.isArray(bud.categories)) {
        const err = validateBudget(bud);
        if (err) {
          alert(`Invalid budget: ${err}`);
          return;
        }
        setBudget(bud as Budget);
        if (parsed.settings) updateSettings(parsed.settings); // restore style if it came from a "+ style" export
        if (typeof parsed.name === 'string' && parsed.name.trim()) setProjectName(parsed.name);
        flashImported();
      } else if (Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) {
        setBudget(migrateModelToBudget(parsed as SankeyModel)); // old raw model format
        flashImported();
      } else {
        alert("That doesn't look like a Nagare budget or diagram JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <header style={bar}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: '1.35rem', letterSpacing: '0.02em' }}>Nagare</span>
        <span className="kanji" style={{ color: 'var(--accent)', fontSize: '1.05rem', opacity: 0.85 }}>流れ</span>
        <span style={{ color: 'var(--ctp-surface2)', margin: '0 2px' }}>·</span>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={{ background: 'transparent', border: 'none', fontFamily: 'var(--display)', fontSize: '1rem', color: 'var(--ctp-subtext1)', width: 'min(28vw, 260px)' }}
          title="Project name"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button className="ghost" onClick={undo} disabled={past === 0} title="Undo (Ctrl+Z)">
          <Undo2 size={16} />
        </button>
        <button className="ghost" onClick={redo} disabled={future === 0} title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={16} />
        </button>

        <div style={sep} />

        <button onClick={() => newProject()} title="New project">
          <FilePlus2 size={15} /> New
        </button>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setExampleOpen((o) => !o)} title="Load an example flow">
            <Sparkles size={15} /> Examples <ChevronDown size={13} />
          </button>
          {exampleOpen && (
            <>
              <div style={backdrop} onClick={() => setExampleOpen(false)} />
              <div style={{ ...menu, right: 'auto', left: 0 }}>
                {BUDGET_EXAMPLES.map((ex) => (
                  <MenuItem
                    key={ex.id}
                    icon={<Sparkles size={14} />}
                    onClick={() => {
                      setBudget(ex.budget);
                      setExampleOpen(false);
                    }}
                  >
                    {ex.name}
                  </MenuItem>
                ))}
              </div>
            </>
          )}
        </div>

        <button onClick={onOpenProjects} title="Open saved projects">
          <FolderOpen size={15} /> Open
        </button>
        <button className="primary" onClick={doSave} title="Save to browser">
          <Save size={15} /> {saved ? 'Saved ✓' : 'Save'}
        </button>

        <div style={sep} />

        <button onClick={() => fileRef.current?.click()} title="Import a budget or diagram JSON">
          <Upload size={15} /> {imported ? 'Imported ✓' : 'Import'}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onImport} />

        <div style={{ position: 'relative' }}>
          <button className="primary" onClick={() => setExportOpen((o) => !o)}>
            <Download size={15} /> Export <ChevronDown size={13} />
          </button>
          {exportOpen && (
            <>
              <div style={backdrop} onClick={() => setExportOpen(false)} />
              <div style={menu}>
                <MenuItem icon={<Image size={14} />} onClick={() => withSvg((svg) => exportPNG(svg, slug(projectName), 2))}>
                  PNG <span style={hint}>@2×</span>
                </MenuItem>
                <MenuItem icon={<Image size={14} />} onClick={() => withSvg((svg) => exportPNG(svg, slug(projectName), 4))}>
                  PNG <span style={hint}>@4×</span>
                </MenuItem>
                <MenuItem icon={<FileCode size={14} />} onClick={() => withSvg((svg) => exportSVG(svg, slug(projectName)))}>
                  SVG <span style={hint}>vector</span>
                </MenuItem>
                <MenuItem icon={<Braces size={14} />} onClick={() => { exportJSON(budget, slug(projectName)); setExportOpen(false); }}>
                  JSON <span style={hint}>budget</span>
                </MenuItem>
                <MenuItem icon={<Braces size={14} />} onClick={() => { exportJSON({ name: projectName, budget, settings }, `${slug(projectName)}-project`); setExportOpen(false); }}>
                  JSON <span style={hint}>+ style</span>
                </MenuItem>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({ icon, onClick, children }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="ghost"
      onClick={onClick}
      style={{ width: '100%', justifyContent: 'flex-start', gap: 9, borderRadius: 0, padding: '0.5rem 0.7rem' }}
    >
      {icon}
      <span style={{ flex: 1, textAlign: 'left' }}>{children}</span>
    </button>
  );
}

const bar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '0.5rem 0.9rem',
  background: 'var(--ctp-mantle)',
  borderBottom: 'var(--hairline)',
  flexWrap: 'wrap',
};
const sep: React.CSSProperties = { width: 1, height: 22, background: 'var(--ctp-surface1)', margin: '0 3px' };
const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 20 };
const menu: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 5px)',
  minWidth: 168,
  background: 'var(--ctp-base)',
  border: 'var(--hairline)',
  borderRadius: 5,
  overflow: 'hidden',
  zIndex: 21,
  boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
};
const hint: React.CSSProperties = { color: 'var(--ctp-overlay0)', fontSize: '0.7rem', marginLeft: 6 };
