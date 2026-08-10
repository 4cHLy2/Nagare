import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { computeLayout, linkPath, linkSourceId, linkTargetId, type LaidOutLink, type LaidOutNode } from '../lib/sankey';
import { backgroundById, nodeColorMap, paletteById } from '../theme';
import { formatValue, formatPercent } from '../lib/format';

export interface CanvasHandle {
  getSvg: () => SVGSVGElement | null;
}

interface TooltipState {
  x: number;
  y: number;
  lines: string[];
}

const SankeyCanvas = forwardRef<CanvasHandle>(function SankeyCanvas(_props, ref) {
  const model = useStore((s) => s.model);
  const settings = useStore((s) => s.settings);
  const selection = useStore((s) => s.selection);
  const setSelection = useStore((s) => s.setSelection);
  const setNodePosition = useStore((s) => s.setNodePosition);

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [hoverLink, setHoverLink] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  // drag state, store only gets hit on pointerup
  // pointerCapture not window listeners, grab kept dropping
  const [liveDrag, setLiveDrag] = useState<{ id: string; y: number } | null>(null);
  const dragId = useRef<string | null>(null);
  const dragGeom = useRef<{ top: number; height: number } | null>(null); // svg rect, cached on pointerdown. no gBCR per move
  const lastY = useRef(0);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false); // else ending a drag also selects the node

  // first go, window listeners. grab died the moment the pointer left the rect
  // useEffect(() => {
  //   const move = (e: PointerEvent) => {
  //     const g = dragGeom.current;
  //     if (!g || !dragId.current) return;
  //     lastY.current = Math.max(0, Math.min(1, (e.clientY - g.top) / g.height));
  //     setLiveDrag({ id: dragId.current, y: lastY.current });
  //   };
  //   const up = () => {
  //     if (dragId.current && movedRef.current) setNodePosition(dragId.current, lastY.current);
  //     dragId.current = null;
  //     setLiveDrag(null);
  //   };
  //   window.addEventListener('pointermove', move);
  //   window.addEventListener('pointerup', up);
  //   return () => {
  //     window.removeEventListener('pointermove', move);
  //     window.removeEventListener('pointerup', up);
  //   };
  // }, [setNodePosition]);

  useImperativeHandle(ref, () => ({ getSvg: () => svgRef.current }), []);

  // viewBox === real px, else fuzzy strokes
  // layoutEffect, useEffect flashed. RO alone missed stuff, keep both
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) => {
        const w = Math.max(200, Math.round(r.width));
        const h = Math.max(200, Math.round(r.height));
        return prev.w === w && prev.h === h ? prev : { w, h };
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const palette = paletteById(settings.paletteId);
  const bg = backgroundById(settings.backgroundId);

  const nodeColor = useMemo(() => nodeColorMap(model.nodes, palette), [model.nodes, palette]);

  // model + live drag. keep it out of the store or dragging feels like mud
  const effModel = useMemo(() => {
    if (!liveDrag) return model;
    return {
      ...model,
      nodes: model.nodes.map((n) => (n.id === liveDrag.id ? { ...n, y: liveDrag.y } : n)),
    };
  }, [model, liveDrag]);

  const layout = useMemo(() => {
    try {
      const l = computeLayout(effModel, size.w, size.h, settings);
      return { ...l, error: null as string | null };
    } catch (e) {
      return { nodes: [], links: [], error: (e as Error).message };
    }
  }, [effModel, size, settings]);

  // NUL sep, ids can be anything. keep the escape, raw byte = git thinks binary
  const linkKey = (s: string, t: string) => `${s}\u0000${t}`;

  // roots only = total income. summing all nodes counts the same money 3x
  const grandTotal = useMemo(
    () => layout.nodes.filter((n) => (n.targetLinks?.length ?? 0) === 0).reduce((s, n) => s + (n.value ?? 0), 0),
    [layout.nodes],
  );

  // col totals keyed on rounded x0. d3 floats drift ~1e-12 in the same col
  const layerTotals = useMemo(() => {
    const m = new Map<number, number>();
    for (const n of layout.nodes) {
      const k = Math.round(n.x0 ?? 0);
      m.set(k, (m.get(k) ?? 0) + (n.value ?? 0));
    }
    return m;
  }, [layout.nodes]);

  const fmt = (v: number) => formatValue(v, settings);

  // fall back to grandTotal, roots have no parent. "—" everywhere looked broken
  const nodeDenom = (n: LaidOutNode): number => {
    if (settings.percentBasis === 'layer') return layerTotals.get(Math.round(n.x0 ?? 0)) || grandTotal;
    if (settings.percentBasis === 'parent') {
      const parents = new Set<LaidOutNode>();
      for (const l of n.targetLinks ?? []) parents.add(l.source as LaidOutNode);
      if (parents.size === 0) return grandTotal;
      let s = 0;
      parents.forEach((p) => (s += p.value ?? 0));
      return s || grandTotal;
    }
    return grandTotal;
  };
  const linkDenom = (l: LaidOutLink): number => {
    if (settings.percentBasis === 'parent') return (l.source as LaidOutNode).value || grandTotal;
    if (settings.percentBasis === 'layer') return layerTotals.get(Math.round((l.target as LaidOutNode).x0 ?? 0)) || grandTotal;
    return grandTotal;
  };
  const nodePct = (n: LaidOutNode) => formatPercent(n.value ?? 0, nodeDenom(n), settings);
  const linkPct = (l: LaidOutLink) => formatPercent(l.value ?? 0, linkDenom(l), settings);
  const nodeLabel = useMemo(() => new Map(model.nodes.map((n) => [n.id, n.label || n.id])), [model.nodes]);

  // hover highlight. 1 hop only, full subtree lit up the whole diagram
  const active = useMemo(() => {
    const links = new Set<string>();
    const nodes = new Set<string>();
    if (hoverNode) {
      nodes.add(hoverNode);
      for (const l of layout.links) {
        const s = linkSourceId(l);
        const t = linkTargetId(l);
        if (s === hoverNode || t === hoverNode) {
          links.add(linkKey(s, t));
          nodes.add(s);
          nodes.add(t);
        }
      }
    }
    if (hoverLink) links.add(hoverLink);
    return { links, nodes };
  }, [hoverNode, hoverLink, layout.links]);

  const dimmed = active.links.size > 0 || active.nodes.size > 0;

  const isEmpty = model.nodes.length === 0 || layout.links.length === 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 0, background: bg.bg }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio="xMidYMid meet"
        // inset:0, NOT height:100%. collapses in ff/safari inside a flex item
        style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%', fontFamily: 'var(--mono)', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
        onClick={(e) => {
          if (e.target === svgRef.current) setSelection(null);
        }}
      >
        <rect x={0} y={0} width={size.w} height={size.h} fill={bg.bg} />

        <defs>
          {layout.links.map((l) => {
            const s = linkSourceId(l);
            const t = linkTargetId(l);
            const src = l.source as LaidOutNode;
            const tgt = l.target as LaidOutNode;
            return (
              <linearGradient
                key={`grad-${s}-${t}`}
                id={`grad-${s}-${t}`}
                gradientUnits="userSpaceOnUse"
                x1={src.x1 ?? 0}
                x2={tgt.x0 ?? 0}
              >
                <stop offset="0%" stopColor={nodeColor.get(s)} />
                <stop offset="100%" stopColor={nodeColor.get(t)} />
              </linearGradient>
            );
          })}
        </defs>

        {/* ribbons first so nodes land on top */}
        <g fill="none">
          {layout.links.map((l) => {
            const s = linkSourceId(l);
            const t = linkTargetId(l);
            const key = linkKey(s, t);
            const override = (l as { color?: string }).color;
            let stroke: string;
            if (override) stroke = override;
            else if (settings.linkColorMode === 'static') stroke = settings.staticLinkColor;
            else if (settings.linkColorMode === 'source') stroke = nodeColor.get(s)!;
            else if (settings.linkColorMode === 'target') stroke = nodeColor.get(t)!;
            else stroke = `url(#grad-${s}-${t})`;

            const isActive = active.links.has(key);
            const isSelected =
              selection?.kind === 'link' && selection.source === s && selection.target === t;
            const op = dimmed ? (isActive ? Math.min(1, settings.linkOpacity + 0.35) : settings.linkOpacity * 0.25) : settings.linkOpacity;

            return (
              <path
                key={key}
                d={linkPath(l, settings.curvature)}
                stroke={stroke}
                strokeWidth={Math.max(1, l.width ?? 1)}
                strokeOpacity={isSelected ? Math.min(1, settings.linkOpacity + 0.45) : op}
                style={{ cursor: 'pointer', transition: 'stroke-opacity 0.12s ease' }}
                onMouseEnter={(e) => {
                  setHoverLink(key);
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    lines: [`${nodeLabel.get(s) ?? s} → ${nodeLabel.get(t) ?? t}`, `${fmt(l.value ?? 0)}${settings.showPercent && grandTotal > 0 ? `  ·  ${linkPct(l)}` : ''}`],
                  });
                }}
                onMouseMove={(e) => setTooltip((tp) => (tp ? { ...tp, x: e.clientX, y: e.clientY } : tp))}
                onMouseLeave={() => {
                  setHoverLink(null);
                  setTooltip(null);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelection({ kind: 'link', source: s, target: t });
                }}
              />
            );
          })}
        </g>

        {/* nodes + their labels */}
        <g>
          {layout.nodes.map((n) => {
            const id = n.id;
            const x = n.x0 ?? 0;
            const y = n.y0 ?? 0;
            const w = (n.x1 ?? 0) - (n.x0 ?? 0);
            const h = Math.max(1, (n.y1 ?? 0) - (n.y0 ?? 0));
            const fill = nodeColor.get(id)!;
            const isActive = active.nodes.has(id);
            const isSelected = selection?.kind === 'node' && selection.id === id;
            const op = dimmed ? (isActive ? 1 : 0.3) : 1;
            // misnamed. true = node is in the LEFT half = label goes right
            const rightHalf = (n.x0 ?? 0) < size.w / 2;
            const label = n.label || id;
            const cy = (y + (n.y1 ?? 0)) / 2;
            const labelX = rightHalf ? (n.x1 ?? 0) + 7 : (n.x0 ?? 0) - 7;
            const anchor = rightHalf ? 'start' : 'end';
            const subParts: string[] = [];
            if (settings.showValues) subParts.push(fmt(n.value ?? 0));
            if (settings.showPercent && grandTotal > 0) subParts.push(nodePct(n));
            const sub = subParts.join('  ·  ');
            const hasSub = sub.length > 0;

            return (
              <g key={id} opacity={op} style={{ transition: 'opacity 0.12s ease' }}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={settings.nodeRadius}
                  fill={fill}
                  stroke={isSelected ? bg.fg : 'none'}
                  strokeWidth={isSelected ? 1.5 : 0}
                  style={{ cursor: liveDrag?.id === id ? 'grabbing' : 'ns-resize', touchAction: 'none' }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    const svg = svgRef.current;
                    if (!svg) return;
                    const r = svg.getBoundingClientRect();
                    dragId.current = id;
                    dragGeom.current = { top: r.top, height: r.height };
                    movedRef.current = false;
                    lastY.current = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setTooltip(null);
                    setHoverNode(null);
                  }}
                  onPointerMove={(e) => {
                    if (dragId.current !== id || !dragGeom.current) return;
                    movedRef.current = true;
                    suppressClickRef.current = true;
                    const g = dragGeom.current;
                    lastY.current = Math.max(0, Math.min(1, (e.clientY - g.top) / g.height));
                    setLiveDrag({ id, y: lastY.current });
                  }}
                  onPointerUp={(e) => {
                    if (dragId.current !== id) return;
                    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already gone, don't care */ }
                    dragId.current = null;
                    dragGeom.current = null;
                    // only write if it actually moved
                    // console.log('drop', id, lastY.current, movedRef.current);
                    if (movedRef.current) setNodePosition(id, lastY.current);
                    setLiveDrag(null);
                  }}
                  onPointerCancel={() => {
                    dragId.current = null;
                    dragGeom.current = null;
                    setLiveDrag(null);
                  }}
                  onMouseEnter={(e) => {
                    if (dragId.current) return;
                    setHoverNode(id);
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      lines: [label, `${fmt(n.value ?? 0)}${settings.showPercent && grandTotal > 0 ? `  ·  ${nodePct(n)}` : ''}`],
                    });
                  }}
                  onMouseMove={(e) => setTooltip((tp) => (tp ? { ...tp, x: e.clientX, y: e.clientY } : tp))}
                  onMouseLeave={() => {
                    setHoverNode(null);
                    setTooltip(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    setSelection({ kind: 'node', id });
                  }}
                />
                {settings.showLabels && (
                  <text
                    x={labelX}
                    y={cy}
                    textAnchor={anchor}
                    fontSize={settings.labelSize}
                    fill={bg.fg}
                    style={{
                      pointerEvents: 'none', // labels must never eat a click meant for the node
                      fontFamily: 'var(--mono)',
                      // fake halo so labels survive on top of ribbons. 3.5 or it goes bold
                      paintOrder: 'stroke',
                      stroke: bg.bg,
                      strokeWidth: 3.5,
                      strokeLinejoin: 'round',
                    }}
                  >
                    <tspan x={labelX} dy={hasSub ? '-0.15em' : '0.35em'} fontWeight={500}>
                      {label}
                    </tspan>
                    {hasSub && (
                      <tspan x={labelX} dy="1.15em" fontSize={settings.labelSize * 0.82} fill={bg.fg} opacity={0.62}>
                        {sub}
                      </tspan>
                    )}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {layout.error && (
        <div style={overlay}>
          <div style={{ color: 'var(--ctp-red)', fontFamily: 'var(--mono)', fontSize: '0.85rem', maxWidth: 420, textAlign: 'center' }}>
            ⚠ {layout.error}
          </div>
        </div>
      )}

      {isEmpty && !layout.error && (
        <div style={overlay}>
          <div style={{ textAlign: 'center', color: bg.fg, opacity: 0.6 }}>
            <div className="kanji" style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>流れ</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.1rem' }}>
              Add income and spending to begin the flow.
            </div>
          </div>
        </div>
      )}

      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 14,
            top: tooltip.y + 14,
            pointerEvents: 'none',
            background: 'var(--ctp-crust)',
            border: 'var(--hairline)',
            borderRadius: 4,
            padding: '0.4rem 0.6rem',
            zIndex: 50,
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--ctp-text)' }}>{tooltip.lines[0]}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 500 }}>
            {tooltip.lines[1]}
          </div>
        </div>
      )}
    </div>
  );
});

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
};

export default SankeyCanvas;
