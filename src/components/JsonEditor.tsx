import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { validateBudget } from '../lib/budget';
import type { Budget } from '../types';
import { Check, AlertTriangle, Wand2 } from 'lucide-react';

export default function JsonEditor() {
  const budget = useStore((s) => s.budget);
  const setBudget = useStore((s) => s.setBudget);

  const [text, setText] = useState(() => JSON.stringify(budget, null, 2));
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);

  // sync textarea when budget changes elsewhere, but never while typing here
  useEffect(() => {
    if (!focused.current) {
      setText(JSON.stringify(budget, null, 2));
      setError(null);
    }
  }, [budget]);

  const apply = (raw: string) => {
    setText(raw);
    let parsed: Budget;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const err = validateBudget(parsed);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setBudget(parsed);
  };

  const format = () => {
    try {
      setText(JSON.stringify(JSON.parse(text), null, 2));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--ctp-overlay0)' }}>
          {'{ sources[], categories[] }'}
        </span>
        <button className="ghost" onClick={format} title="Reformat JSON">
          <Wand2 size={13} /> format
        </button>
      </div>

      <textarea
        value={text}
        spellCheck={false}
        onFocus={() => (focused.current = true)}
        onBlur={() => (focused.current = false)}
        onChange={(e) => apply(e.target.value)}
        style={{
          flex: 1,
          minHeight: 320,
          resize: 'none',
          lineHeight: 1.55,
          fontSize: '0.78rem',
          tabSize: 2,
          borderColor: error ? 'var(--ctp-red)' : undefined,
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 6,
          fontFamily: 'var(--mono)',
          fontSize: '0.74rem',
          color: error ? 'var(--ctp-red)' : 'var(--ctp-green)',
          minHeight: '2.2em',
        }}
      >
        {error ? <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <Check size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
        <span>{error ?? 'Valid — changes are live.'}</span>
      </div>
    </div>
  );
}
