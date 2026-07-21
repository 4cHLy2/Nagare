import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import TopBar from './components/TopBar';
import SankeyCanvas, { type CanvasHandle } from './components/SankeyCanvas';
import BudgetEditor from './components/BudgetEditor';
import JsonEditor from './components/JsonEditor';
import StylePanel from './components/StylePanel';
import ProjectsDrawer from './components/ProjectsDrawer';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';

type EditorTab = 'budget' | 'json';

export default function App() {
  const [tab, setTab] = useState<EditorTab>('budget');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);

  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  // undo/redo shortcuts, skip while typing in an input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <div style={shell}>
      <TopBar
        canvasRef={canvasRef}
        onOpenProjects={() => setDrawerOpen(true)}
      />

      <div style={main}>
        {leftOpen ? (
          <aside style={{ ...panel, width: 360, borderRight: 'var(--hairline)' }}>
            <div style={tabRow}>
              <div style={{ display: 'flex', gap: 4 }}>
                <TabButton active={tab === 'budget'} onClick={() => setTab('budget')}>
                  Budget
                </TabButton>
                <TabButton active={tab === 'json'} onClick={() => setTab('json')}>
                  JSON
                </TabButton>
              </div>
              <button className="ghost" title="Collapse panel" onClick={() => setLeftOpen(false)}>
                <PanelLeftClose size={15} />
              </button>
            </div>
            <div style={panelBody}>{tab === 'budget' ? <BudgetEditor /> : <JsonEditor />}</div>
          </aside>
        ) : (
          <EdgeToggle side="left" onClick={() => setLeftOpen(true)}>
            <PanelLeftOpen size={16} />
          </EdgeToggle>
        )}

        <main style={canvasWrap}>
          <SankeyCanvas ref={canvasRef} />
        </main>

        {rightOpen ? (
          <aside style={{ ...panel, width: 300, borderLeft: 'var(--hairline)' }}>
            <div style={tabRow}>
              <span style={panelTitle}>Style</span>
              <button className="ghost" title="Collapse panel" onClick={() => setRightOpen(false)}>
                <PanelRightClose size={15} />
              </button>
            </div>
            <div style={panelBody}>
              <StylePanel />
            </div>
          </aside>
        ) : (
          <EdgeToggle side="right" onClick={() => setRightOpen(true)}>
            <PanelRightOpen size={16} />
          </EdgeToggle>
        )}
      </div>

      {drawerOpen && <ProjectsDrawer onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'color-mix(in srgb, var(--accent) 20%, var(--ctp-surface0))' : 'transparent',
        borderColor: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--ctp-text)' : 'var(--ctp-subtext0)',
      }}
    >
      {children}
    </button>
  );
}

function EdgeToggle({ side, onClick, children }: { side: 'left' | 'right'; onClick: () => void; children: React.ReactNode }) {
  return (
    <div style={{ ...edgeToggle, [side]: 0 }}>
      <button className="ghost" onClick={onClick} title="Expand panel">
        {children}
      </button>
    </div>
  );
}

const shell: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
  gridTemplateColumns: 'minmax(0, 1fr)', // don't let content widen the grid past the viewport
  height: '100%',
  width: '100%',
  overflow: 'hidden',
};
const main: React.CSSProperties = { display: 'flex', minHeight: 0, minWidth: 0, position: 'relative', overflow: 'hidden' };
const panel: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--ctp-mantle)',
  minHeight: 0,
  flexShrink: 0,
};
const tabRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.55rem 0.6rem',
  borderBottom: 'var(--hairline)',
};
const panelTitle: React.CSSProperties = {
  fontFamily: 'var(--display)',
  fontSize: '1.05rem',
  color: 'var(--ctp-text)',
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'baseline',
};
const panelBody: React.CSSProperties = { overflow: 'auto', padding: '0.85rem', minHeight: 0, flex: 1 };
const canvasWrap: React.CSSProperties = { flex: 1, minWidth: 0, position: 'relative', display: 'flex' };
const edgeToggle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  zIndex: 5,
  padding: '0 6px',
};
