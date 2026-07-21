import { useStore } from '../store';
import { BACKGROUNDS, PALETTES } from '../theme';
import { CURRENCIES, formatValue } from '../lib/format';
import type { LinkColorMode, NodeAlign, NodeSort, NumberFormat, PercentBasis } from '../types';
import { X } from 'lucide-react';

export default function StylePanel() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const selection = useStore((s) => s.selection);
  const resetPositions = useStore((s) => s.resetPositions);
  const resetColors = useStore((s) => s.resetColors);
  const hasManualPositions = useStore((s) => s.model.nodes.some((n) => n.y !== undefined));
  const hasColorOverrides = useStore(
    (s) =>
      !!s.budget.netColor ||
      !!s.budget.unallocatedColor ||
      s.budget.sources.some((x) => x.color) ||
      s.budget.categories.some((c) => c.color || c.items.some((it) => it.color)),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
      {selection?.kind === 'link' && <LinkInspector />}

      {/* palette */}
      <Group
        title="Palette"
        action={
          <button
            className="ghost"
            disabled={!hasColorOverrides}
            onClick={resetColors}
            title="clear every per-node colour so all nodes follow the palette"
            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
          >
            reset
          </button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {PALETTES.map((p) => {
            const active = settings.paletteId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => update({ paletteId: p.id })}
                style={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: 5,
                  padding: 7,
                  borderColor: active ? 'var(--accent)' : 'var(--ctp-surface1)',
                  background: active ? 'color-mix(in srgb, var(--accent) 12%, var(--ctp-surface0))' : 'var(--ctp-surface0)',
                }}
              >
                <div style={{ display: 'flex', height: 10, borderRadius: 2, overflow: 'hidden' }}>
                  {p.colors.map((c) => (
                    <div key={c} style={{ flex: 1, background: c }} />
                  ))}
                </div>
                <span style={{ fontSize: '0.72rem', textAlign: 'left', color: active ? 'var(--ctp-text)' : 'var(--ctp-subtext0)' }}>
                  {p.name} <span className="kanji" style={{ opacity: 0.6 }}>{p.kanji}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Group>

      {/* background */}
      <Group title="Canvas">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {BACKGROUNDS.map((b) => {
            const active = settings.backgroundId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => update({ backgroundId: b.id })}
                style={{
                  gap: 7,
                  borderColor: active ? 'var(--accent)' : 'var(--ctp-surface1)',
                  background: active ? 'color-mix(in srgb, var(--accent) 12%, var(--ctp-surface0))' : 'var(--ctp-surface0)',
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: 3, background: b.bg, border: '1px solid var(--ctp-surface2)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem' }}>{b.name}</span>
              </button>
            );
          })}
        </div>
      </Group>

      {/* links */}
      <Group title="Links">
        <Row label="colour by">
          <select value={settings.linkColorMode} onChange={(e) => update({ linkColorMode: e.target.value as LinkColorMode })}>
            <option value="gradient">gradient</option>
            <option value="source">source node</option>
            <option value="target">target node</option>
            <option value="static">single colour</option>
          </select>
        </Row>
        {settings.linkColorMode === 'static' && (
          <Row label="link colour">
            <input type="color" value={settings.staticLinkColor} onChange={(e) => update({ staticLinkColor: e.target.value })} />
          </Row>
        )}
        <Slider label="opacity" value={settings.linkOpacity} min={0.1} max={1} step={0.02} onChange={(v) => update({ linkOpacity: v })} />
        <Slider label="curvature" value={settings.curvature} min={0} max={1} step={0.02} onChange={(v) => update({ curvature: v })} />
      </Group>

      {/* nodes */}
      <Group title="Nodes">
        <Row label="alignment">
          <select value={settings.nodeAlign} onChange={(e) => update({ nodeAlign: e.target.value as NodeAlign })}>
            <option value="justify">justify</option>
            <option value="left">left</option>
            <option value="right">right</option>
            <option value="center">center</option>
          </select>
        </Row>
        <Row label="sort order">
          <select value={settings.nodeSort} onChange={(e) => update({ nodeSort: e.target.value as NodeSort })}>
            <option value="auto">auto (fewest crossings)</option>
            <option value="input">input order</option>
            <option value="descending">value ↓</option>
            <option value="ascending">value ↑</option>
          </select>
        </Row>
        <Slider label="width" value={settings.nodeWidth} min={4} max={48} step={1} onChange={(v) => update({ nodeWidth: v })} unit="px" />
        <Slider label="padding" value={settings.nodePadding} min={0} max={48} step={1} onChange={(v) => update({ nodePadding: v })} unit="px" />
        <Slider label="corner radius" value={settings.nodeRadius} min={0} max={12} step={1} onChange={(v) => update({ nodeRadius: v })} unit="px" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <label style={{ color: 'var(--ctp-overlay1)', fontSize: '0.72rem' }}>
            drag nodes vertically to reposition
          </label>
          <button className="ghost" disabled={!hasManualPositions} onClick={resetPositions} title="Clear manual node positions">
            reset positions
          </button>
        </div>
      </Group>

      {/* values */}
      <Group title="Values">
        <Row label="format">
          <select value={settings.numberFormat} onChange={(e) => update({ numberFormat: e.target.value as NumberFormat })}>
            <option value="currency">currency</option>
            <option value="plain">plain number</option>
          </select>
        </Row>
        {settings.numberFormat === 'currency' ? (
          <Row label="currency">
            <select value={settings.currency} onChange={(e) => update({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </Row>
        ) : (
          <Row label="unit suffix">
            <input style={{ width: 90 }} value={settings.valueSuffix} placeholder="e.g. kWh" onChange={(e) => update({ valueSuffix: e.target.value })} />
          </Row>
        )}
        <Row label="locale">
          <input style={{ width: 90 }} value={settings.locale} placeholder="de-DE" onChange={(e) => update({ locale: e.target.value })} />
        </Row>
        <Slider label="decimals" value={settings.decimals} min={0} max={4} step={1} onChange={(v) => update({ decimals: v })} />
        <Toggle label="show percent" value={settings.showPercent} onChange={(v) => update({ showPercent: v })} />
        {settings.showPercent && (
          <Row label="percent of">
            <select value={settings.percentBasis} onChange={(e) => update({ percentBasis: e.target.value as PercentBasis })}>
              <option value="total">total income</option>
              <option value="parent">parent flow</option>
              <option value="layer">column</option>
            </select>
          </Row>
        )}
      </Group>

      {/* labels */}
      <Group title="Labels">
        <Toggle label="show labels" value={settings.showLabels} onChange={(v) => update({ showLabels: v })} />
        <Toggle label="show values" value={settings.showValues} onChange={(v) => update({ showValues: v })} />
        <Slider label="label size" value={settings.labelSize} min={8} max={24} step={1} onChange={(v) => update({ labelSize: v })} unit="px" />
      </Group>
    </div>
  );
}

function LinkInspector() {
  const model = useStore((s) => s.model);
  const settings = useStore((s) => s.settings);
  const selection = useStore((s) => s.selection);
  const setSelection = useStore((s) => s.setSelection);
  if (selection?.kind !== 'link') return null;
  const link = model.links.find((l) => l.source === selection.source && l.target === selection.target);
  if (!link) return null;
  const labelOf = (id: string) => model.nodes.find((n) => n.id === id)?.label || id;

  return (
    <div style={inspector}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>
          FLOW
        </span>
        <button className="ghost" onClick={() => setSelection(null)} title="Close">
          <X size={13} />
        </button>
      </div>
      <div className="mono" style={{ fontSize: '0.8rem', marginBottom: 6, color: 'var(--ctp-subtext1)' }}>
        {labelOf(link.source)} → {labelOf(link.target)}
      </div>
      <div className="mono" style={{ fontSize: '0.95rem', color: 'var(--accent)', marginBottom: 6 }}>
        {formatValue(link.value, settings)}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--ctp-overlay1)' }}>
        Amounts and colours are edited in the <span style={{ color: 'var(--accent)' }}>Budget</span> tab.
      </div>
    </div>
  );
}

function Group({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 7, marginBottom: 9, minHeight: 22 }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: '1rem', color: 'var(--ctp-text)' }}>{title}</span>
        {action}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <label>{label}</label>
        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ctp-subtext0)' }}>
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {unit ?? ''}
        </span>
      </div>
      <input type="range" style={{ width: '100%' }} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <label>{label}</label>
      <button
        className="ghost"
        onClick={() => onChange(!value)}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          padding: 2,
          justifyContent: value ? 'flex-end' : 'flex-start',
          background: value ? 'color-mix(in srgb, var(--accent) 35%, var(--ctp-surface0))' : 'var(--ctp-surface0)',
          border: '1px solid var(--ctp-surface1)',
        }}
      >
        <span style={{ width: 16, height: 16, borderRadius: '50%', background: value ? 'var(--accent)' : 'var(--ctp-overlay0)', display: 'block' }} />
      </button>
    </div>
  );
}

const inspector: React.CSSProperties = {
  padding: 10,
  background: 'var(--ctp-crust)',
  border: '1px solid var(--accent)',
  borderRadius: 5,
};
