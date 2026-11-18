import React, { useRef, useState } from 'react';
import { evaluateCalc, looksLikeCalc } from '../lib/calc';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { type?: string };

/**
 * A number field that also takes a sum: type 12*1.5 or 100-15% and it becomes the result on
 * Enter or when you leave the field. Plain numbers reach onChange as you type, as before; a sum
 * waits until it is worked out, with the result shown under the field meanwhile.
 * onChange receives an object with target.value, like a normal change event.
 */
export function CalcInput({ value, onChange, onBlur, onKeyDown, onFocus, min, max, step, type: _type, className, ...rest }: Props) {
  void step;
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
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
  const commit = () => {
    if (draft === null) return;
    if (looksLikeCalc(draft)) {
      const r = evaluateCalc(draft);
      if (r !== null) fire(String(clamp(r)));
    }
    setDraft(null);
  };
  const result = draft !== null && looksLikeCalc(draft) ? evaluateCalc(draft) : null;

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
          if (e.key === 'Enter' && draft !== null && looksLikeCalc(draft)) { e.preventDefault(); commit(); }
          onKeyDown?.(e);
        }}
      />
      {draft !== null && looksLikeCalc(draft) && ref.current && (() => {
        // the result floats under the field, so the field keeps its place in any layout
        const r = ref.current.getBoundingClientRect();
        return (
          <span
            className={`pointer-events-none fixed z-[60] px-1.5 py-0.5 rounded-md text-[11px] font-extrabold shadow-sm ${result === null ? 'bg-rose-50 text-rose-600' : 'bg-slate-900 text-white'}`}
            style={{ top: r.bottom + 3, left: r.left + r.width / 2, transform: 'translateX(-50%)' }}
            dir="ltr"
          >
            {result === null ? '…' : `= ${result}`}
          </span>
        );
      })()}
    </>
  );
}
