import { useState } from 'react';
import { useStore } from '../store';
import { X, FolderOpen, Trash2, Clock } from 'lucide-react';

const fmtTime = (t: number) =>
  new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function ProjectsDrawer({ onClose }: { onClose: () => void }) {
  const listProjects = useStore((s) => s.listProjects);
  const loadProject = useStore((s) => s.loadProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const currentId = useStore((s) => s.projectId);
  const [, force] = useState(0);

  const projects = listProjects();

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <span style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', display: 'flex', gap: 8, alignItems: 'baseline' }}>
            Saved Flows
          </span>
          <button className="ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflow: 'auto', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {projects.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--ctp-overlay0)', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>
              No saved flows yet. Hit <span style={{ color: 'var(--accent)' }}>Save</span> to store one here.
            </div>
          )}
          {projects.map((p) => (
            <div key={p.id} style={{ ...item, ...(p.id === currentId ? itemCurrent : null) }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1rem', color: 'var(--ctp-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                  {p.id === currentId && <span className="mono" style={{ color: 'var(--accent)', fontSize: '0.68rem', marginLeft: 8 }}>current</span>}
                </div>
                <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--ctp-overlay0)', display: 'flex', gap: 12, marginTop: 3 }}>
                  <span>{p.budget.sources.length} income · {p.budget.categories.length} categories</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {fmtTime(p.updatedAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  loadProject(p.id);
                  onClose();
                }}
                title="Open"
              >
                <FolderOpen size={14} /> Open
              </button>
              <button
                className="ghost"
                title="Delete"
                onClick={() => {
                  if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                    deleteProject(p.id);
                    force((n) => n + 1);
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: '10vh',
  zIndex: 100,
  backdropFilter: 'blur(2px)',
};
const panel: React.CSSProperties = {
  width: 'min(560px, 92vw)',
  maxHeight: '72vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--ctp-mantle)',
  border: 'var(--hairline)',
  borderRadius: 8,
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};
const head: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.8rem 1rem',
  borderBottom: 'var(--hairline)',
};
const item: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0.6rem 0.7rem',
  border: 'var(--hairline)',
  borderRadius: 5,
  background: 'var(--ctp-base)',
};
const itemCurrent: React.CSSProperties = { borderColor: 'var(--accent)' };
