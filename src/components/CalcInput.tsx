import React, { useEffect, useRef, useState } from 'react';
import { evaluateCalc, looksLikeCalc } from '../lib/calc';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { type?: string };

/** Touch screens: the number pad a tablet opens has no + − × ÷, so the field brings its own. */
const isTouch = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

const OPS: Array<{ label: string; insert: string }> = [
  { label: '+', insert: '+' },
  { label: '−', insert: '-' },
  { label: '×', insert: '*' },
  { label: '÷', insert: '/' },
  { label: '%', insert: '%' },
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
];

/**
 * A number field that also takes a sum: type 12*1.5 or 100-15% and it becomes the result on
 * Enter, "=" or when you leave the field. Plain numbers reach onChange as you type, as before; a sum
 * waits until it is worked out, with the result shown meanwhile. On a touch screen a small bar
 * with + − × ÷ % ( ) = floats above the field while it has focus.
 * onChange receives an object with target.value, like a normal change event.
 */
export function CalcInput({ value, onChange, onBlur, onKeyDown, onFocus, min, max, step, type: _type, className, ...rest }: Props) {
  void step;
  const [draft, setDraft] = useState<string | null>(null);
  const [, setTick] = useState(0); // re-place the floating bar when the page scrolls or resizes
  const ref = useRef<HTMLInputElement>(null);
  const touch = useRef(isTouch());

  const fire = (v: string) => {
    if (!onChange) return;
    const fake = { target: { value: v }, currentTarget: { value: v } } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(fake);
  };
  const clamp = (n: number) => {
    let r = n;
    if (min !== undefined && min !== '' && r < Number(min)) r = Number(min);
    if (max !== undefined && max !== '' && r > Number(max)) r = Number(max);
    return r;
  };
  /** Works out a sum; keepFocus leaves the field open with the result in it. */
  const commit = (keepFocus = false) => {
    if (draft === null) return;
    if (looksLikeCalc(draft)) {
      const r = evaluateCalc(draft);
      if (r !== null) {
        const v = String(clamp(r));
        fire(v);
        if (keepFocus) { setDraft(v); return; }
      }
    }
    setDraft(null);
  };
  const result = draft !== null && looksLikeCalc(draft) ? evaluateCalc(draft) : null;
  const focused = draft !== null;

  useEffect(() => {
    if (!focused) return;
    const bump = () => setTick(t => t + 1);
    window.addEventListener('scroll', bump, true);
    window.addEventListener('resize', bump);
    window.visualViewport?.addEventListener('resize', bump);
    return () => {
      window.removeEventListener('scroll', bump, true);
      window.removeEventListener('resize', bump);
      window.visualViewport?.removeEventListener('resize', bump);
    };
  }, [focused]);

  /** Puts an operator where the caret is, keeping the keyboard open. */
  const insert = (text: string) => {
    const el = ref.current;
    const cur = draft ?? String(value ?? '');
    const start = el?.selectionStart ?? cur.length;
    const end = el?.selectionEnd ?? cur.length;
    const next = cur.slice(0, start) + text + cur.slice(end);
    setDraft(next);
    if (!looksLikeCalc(next)) fire(next);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + text.length, start + text.length); });
  };
  // a tap on the bar must not take the focus away from the field
  const keep = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();

  const rect = focused && ref.current ? ref.current.getBoundingClientRect() : null;
  const showBar = focused && touch.current && rect;
  const showBadge = focused && looksLikeCalc(draft || '') && rect && !touch.current;

  return (
    <>
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="decimal"
        dir={rest.dir ?? 'ltr'}
        autoComplete="off"
        value={draft ?? (value ?? '')}
        className={className}
        onFocus={e => { setDraft(String(value ?? '')); onFocus?.(e); }}
        onChange={e => {
          const t = e.target.value;
          setDraft(t);
          if (!looksLikeCalc(t)) fire(t.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660)).replace('٫', '.'));
        }}
        onBlur={e => { commit(); onBlur?.(e); }}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === '=') && draft !== null && looksLikeCalc(draft)) { e.preventDefault(); commit(e.key === '='); }
          onKeyDown?.(e);
        }}
      />
      {showBadge && rect && (
        // keyboard and mouse: the result floats under the field
        <span
          className={`pointer-events-none fixed z-[60] px-1.5 py-0.5 rounded-md text-[11px] font-extrabold shadow-sm ${result === null ? 'bg-rose-50 text-rose-600' : 'bg-slate-900 text-white'}`}
          style={{ top: rect.bottom + 3, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }}
          dir="ltr"
        >
          {result === null ? '…' : `= ${result}`}
        </span>
      )}
      {showBar && rect && (
        // touch: operators and the result in a bar just above the field, clear of the on-screen keyboard
        <div
          className="calc-bar fixed z-[70] flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-300 shadow-lg"
          style={{
            top: Math.max(4, rect.top - 52),
            left: Math.min(Math.max(4, rect.left + rect.width / 2 - 170), window.innerWidth - 344),
            width: 340,
          }}
          dir="ltr"
          onPointerDown={keep}
          onMouseDown={keep}
          role="toolbar"
          aria-label="calculator"
        >
          {OPS.map(op => (
            <button key={op.label} type="button" tabIndex={-1} onPointerDown={keep} onMouseDown={keep} onClick={() => insert(op.insert)}
              className="w-9 h-9 rounded-lg bg-slate-100 active:bg-slate-300 text-slate-900 text-lg font-black leading-none">
              {op.label}
            </button>
          ))}
          <button type="button" tabIndex={-1} onPointerDown={keep} onMouseDown={keep} onClick={() => commit(true)}
            className="h-9 px-3 rounded-lg bg-slate-900 text-white text-base font-black leading-none">
            =
          </button>
          <span className={`flex-1 text-center text-xs font-extrabold font-mono truncate ${result === null && looksLikeCalc(draft || '') ? 'text-rose-500' : 'text-slate-600'}`}>
            {looksLikeCalc(draft || '') ? (result === null ? '…' : result) : ''}
          </span>
        </div>
      )}
    </>
  );
}
