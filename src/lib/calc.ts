/**
 * Arithmetic typed inside a number field: 12*1.5, 24/12, 100-15%, (3+2)*4.
 * Accepts + - * / and × ÷ x, brackets, a trailing % (a percent of what it is added to or
 * taken from: 100-15% = 85, 10*15% = 1.5), Arabic digits and the Arabic comma as a decimal point.
 * Never uses eval. Returns null when the text is not a complete expression.
 */
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

export function normalizeCalc(raw: string): string {
  return raw
    .replace(ARABIC_DIGITS, d => String((d.charCodeAt(0) & 0xf) % 10))
    .replace(/[×xX]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[٫,]/g, '.')
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, '');
}

/** True when the text holds an operator, so it is a sum to work out rather than a number. */
export function looksLikeCalc(raw: string): boolean {
  const s = normalizeCalc(raw);
  return /[-+*/%()]/.test(s.replace(/^-/, '')) && /\d/.test(s);
}

export function evaluateCalc(raw: string): number | null {
  const s = normalizeCalc(raw);
  if (!s) return null;
  let i = 0;
  const peek = () => s[i];
  const num = (): number | null => {
    const m = /^\d*\.?\d+|^\d+\./.exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    return parseFloat(m[0]);
  };
  // factor: number | (expr) | -factor
  const factor = (): number | null => {
    if (peek() === '-') { i++; const f = factor(); return f === null ? null : -f; }
    if (peek() === '+') { i++; return factor(); }
    if (peek() === '(') {
      i++;
      const v = expr();
      if (v === null || peek() !== ')') return null;
      i++;
      return v;
    }
    return num();
  };
  // a value with an optional % after it: { value, pct } so + and - can treat it as a share
  const unit = (): { v: number; pct: boolean } | null => {
    const f = factor();
    if (f === null) return null;
    if (peek() === '%') { i++; return { v: f / 100, pct: true }; }
    return { v: f, pct: false };
  };
  const term = (): { v: number; pct: boolean } | null => {
    let left = unit();
    if (left === null) return null;
    while (peek() === '*' || peek() === '/') {
      const op = s[i++];
      const right = unit();
      if (right === null) return null;
      if (op === '/' && right.v === 0) return null;
      left = { v: op === '*' ? left.v * right.v : left.v / right.v, pct: false };
    }
    return left;
  };
  function expr(): number | null {
    const first = term();
    if (first === null) return null;
    let acc = first.v;
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const t = term();
      if (t === null) return null;
      const amount = t.pct ? acc * t.v : t.v; // 100-15% takes 15% of 100
      acc = op === '+' ? acc + amount : acc - amount;
    }
    return acc;
  }
  const v = expr();
  if (v === null || i !== s.length || !Number.isFinite(v)) return null;
  return Math.round(v * 1e6) / 1e6;
}
