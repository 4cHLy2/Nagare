import { useStore } from '../store';
import { formatValue, formatPercent } from '../lib/format';
import { categoryValue, netTotal, remainder, NET_ID, UNALLOC_ID } from '../lib/budget';
import { nodeColorMap, paletteById } from '../theme';
import { Plus, Trash2, CornerDownRight } from 'lucide-react';
import type { Settings } from '../types';

export default function BudgetEditor() {
  const budget = useStore((s) => s.budget);
  const settings = useStore((s) => s.settings);
  const selection = useStore((s) => s.selection);
  const setSelection = useStore((s) => s.setSelection);
  const addSource = useStore((s) => s.addSource);
  const updateSource = useStore((s) => s.updateSource);
  const removeSource = useStore((s) => s.removeSource);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const removeCategory = useStore((s) => s.removeCategory);
  const addItem = useStore((s) => s.addItem);
  const updateItem = useStore((s) => s.updateItem);
  const removeItem = useStore((s) => s.removeItem);
  const setBudgetMeta = useStore((s) => s.setBudgetMeta);

  const model = useStore((s) => s.model);

  const net = netTotal(budget);
  const left = remainder(budget);
  const fmt = (v: number) => formatValue(v, settings);
  const pct = (v: number, total: number) => (total > 0 ? formatPercent(v, total, settings) : '');
  const selNode = (id: string) => selection?.kind === 'node' && selection.id === id;

  // resolved colors (palette fill where there's no override) so the swatch
  // matches what's actually drawn. single-source rows map onto the net node
  const colors = nodeColorMap(model.nodes, paletteById(settings.paletteId));
  const swatch = (id: string, fallback: string) => colors.get(id) ?? fallback;
  const netSwatch = swatch(NET_ID, '#a6e3a1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      {/* ── income ── */}
      <section>
        <SectionHead label="Income" count={budget.sources.length} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {budget.sources.map((s) => (
            <div key={s.id} style={row}>
              <input type="color" value={s.color ?? swatch(s.id, netSwatch)} onChange={(e) => updateSource(s.id, { color: e.target.value })} title="Colour" />
              <input style={{ flex: 1, minWidth: 0 }} value={s.label} placeholder="Income source" onChange={(e) => updateSource(s.id, { label: e.target.value })} />
              <AmountInput value={s.amount} onChange={(v) => updateSource(s.id, { amount: v })} settings={settings} />
              {budget.sources.length > 1 && (
                <button className="ghost" title="Remove source" onClick={() => removeSource(s.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button className="ghost" style={addBtn} onClick={addSource}>
          <Plus size={13} /> add income source
        </button>

        {/* net summary (the merged node), styled to look editable */}
        <div style={{ ...netRow, ...(selNode(NET_ID) ? rowActive : null) }} onClick={() => setSelection({ kind: 'node', id: NET_ID })}>
          <input type="color" value={budget.netColor ?? netSwatch} onChange={(e) => setBudgetMeta({ netColor: e.target.value })} onClick={(e) => e.stopPropagation()} title="Net colour" />
          <input
            style={{ flex: 1, minWidth: 0, fontFamily: 'var(--display)' }}
            value={budget.netLabel ?? (budget.sources.length === 1 ? budget.sources[0]?.label ?? 'Net Income' : 'Net Income')}
            onChange={(e) => setBudgetMeta({ netLabel: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>{fmt(net)}</span>
        </div>
      </section>

      {/* ── spending ── */}
      <section>
        <SectionHead label="Spending" count={budget.categories.length} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {budget.categories.map((c) => {
            const val = categoryValue(c);
            const hasItems = c.items.length > 0;
            return (
              <div key={c.id} style={catBox}>
                <div style={{ ...row, ...(selNode(c.id) ? rowActive : null) }} onClick={() => setSelection({ kind: 'node', id: c.id })}>
                  <input type="color" value={c.color ?? swatch(c.id, '#cba6f7')} onChange={(e) => updateCategory(c.id, { color: e.target.value })} onClick={(e) => e.stopPropagation()} title="Colour" />
                  <input style={{ flex: 1, minWidth: 0 }} value={c.label} placeholder="Category" onChange={(e) => updateCategory(c.id, { label: e.target.value })} onClick={(e) => e.stopPropagation()} />
                  {hasItems ? (
                    <span className="mono" style={sumText} title="Sum of items">{fmt(val)}</span>
                  ) : (
                    <AmountInput value={c.amount ?? 0} onChange={(v) => updateCategory(c.id, { amount: v })} settings={settings} />
                  )}
                  <button className="ghost" title="Remove category" onClick={(e) => { e.stopPropagation(); removeCategory(c.id); }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {net > 0 && val > 0 && (
                  <div style={pctLine}>{pct(val, net)} of net{hasItems ? '' : ' · lump'}</div>
                )}

                {/* items */}
                {hasItems && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 5 }}>
                    {c.items.map((it) => (
                      <div key={it.id} style={{ ...itemRow, ...(selNode(it.id) ? rowActive : null) }} onClick={() => setSelection({ kind: 'node', id: it.id })}>
                        <CornerDownRight size={13} style={{ flexShrink: 0, color: 'var(--ctp-overlay0)' }} />
                        <input type="color" value={it.color ?? swatch(it.id, c.color ?? '#cba6f7')} onChange={(e) => updateItem(c.id, it.id, { color: e.target.value })} onClick={(e) => e.stopPropagation()} title="Colour" />
                        <input style={{ flex: 1, minWidth: 0 }} value={it.label} placeholder="Item" onChange={(e) => updateItem(c.id, it.id, { label: e.target.value })} onClick={(e) => e.stopPropagation()} />
                        <AmountInput value={it.amount} onChange={(v) => updateItem(c.id, it.id, { amount: v })} settings={settings} />
                        <button className="ghost" title="Remove item" onClick={(e) => { e.stopPropagation(); removeItem(c.id, it.id); }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button className="ghost" style={{ ...addBtn, marginTop: 5 }} onClick={() => addItem(c.id)}>
                  <Plus size={12} /> {hasItems ? 'add item' : 'split into items'}
                </button>
              </div>
            );
          })}
        </div>
        <button className="primary" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={() => addCategory()}>
          <Plus size={14} /> Add category
        </button>

        {/* balance readout */}
        <div style={balanceBox}>
          {left > 0.005 ? (
            <div style={{ ...balRow, ...(selNode(UNALLOC_ID) ? rowActive : null) }} onClick={() => setSelection({ kind: 'node', id: UNALLOC_ID })}>
              <input type="color" value={budget.unallocatedColor ?? swatch(UNALLOC_ID, '#6c7086')} onChange={(e) => setBudgetMeta({ unallocatedColor: e.target.value })} onClick={(e) => e.stopPropagation()} title="Colour" />
              <input style={{ flex: 1, minWidth: 0, color: 'var(--ctp-subtext0)' }} value={budget.unallocatedLabel ?? 'Unallocated'} onChange={(e) => setBudgetMeta({ unallocatedLabel: e.target.value })} onClick={(e) => e.stopPropagation()} />
              <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--ctp-subtext0)' }}>{fmt(left)} · {pct(left, net)}</span>
            </div>
          ) : left < -0.005 ? (
            <div className="mono" style={{ color: 'var(--ctp-red)', fontSize: '0.8rem', padding: '2px 4px' }}>
              ⚠ Overspent by {fmt(-left)} — spending exceeds income.
            </div>
          ) : (
            <div className="mono" style={{ color: 'var(--ctp-green)', fontSize: '0.8rem', padding: '2px 4px' }}>
              ✓ Fully allocated.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AmountInput({ value, onChange, settings }: { value: number; onChange: (v: number) => void; settings: Settings }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <input
        type="number"
        min={0}
        step="any"
        style={{ width: 76, textAlign: 'right' }}
        value={value}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--ctp-overlay0)' }}>
        {settings.numberFormat === 'currency' ? currencySymbol(settings.currency) : settings.valueSuffix}
      </span>
    </div>
  );
}

function currencySymbol(code: string): string {
  try {
    return (0).toLocaleString('en', { style: 'currency', currency: code || 'EUR' }).replace(/[\d.,\s]/g, '') || code;
  } catch {
    return code;
  }
}

function SectionHead({ label, count }: { label: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
      <span style={{ fontFamily: 'var(--display)', fontSize: '1.1rem', color: 'var(--ctp-text)' }}>{label}</span>
      {count !== undefined && <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ctp-overlay0)' }}>{count}</span>}
    </div>
  );
}

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 5px', borderRadius: 4, border: '1px solid transparent', cursor: 'pointer' };
const rowActive: React.CSSProperties = { borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)' };
const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, padding: '3px 4px', borderRadius: 4, border: '1px solid transparent', cursor: 'pointer' };
const netRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 5px', marginTop: 8, borderRadius: 4, border: '1px solid var(--ctp-surface1)', background: 'var(--ctp-crust)', cursor: 'pointer' };
const catBox: React.CSSProperties = { background: 'var(--ctp-crust)', border: 'var(--hairline)', borderRadius: 5, padding: 7 };
const addBtn: React.CSSProperties = { marginTop: 6, fontSize: '0.74rem', color: 'var(--ctp-subtext0)', justifyContent: 'flex-start', gap: 5 };
const sumText: React.CSSProperties = { fontSize: '0.82rem', color: 'var(--accent)', minWidth: 76, textAlign: 'right' };
const pctLine: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--ctp-overlay0)', padding: '1px 6px 0' };
const balanceBox: React.CSSProperties = { marginTop: 10, padding: 6, background: 'var(--ctp-crust)', border: 'var(--hairline)', borderRadius: 5 };
const balRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', borderRadius: 4, border: '1px solid transparent', cursor: 'pointer' };
