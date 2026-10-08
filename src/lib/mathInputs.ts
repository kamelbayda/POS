/**
 * Arithmetic in every number field of the app: type "3*12", "24x0.75+2" or "100/4" in a
 * quantity, price or amount box and it becomes the result on Enter or when leaving the box.
 *
 * Installed once on the document so every screen gets it without changing each input:
 * - number inputs become text inputs while focused, so operators can be typed;
 * - while an expression is being typed the input events are held back from React (a field
 *   that parses its value on each keystroke would otherwise cut "3*" down to "3");
 * - on Enter / leaving the field the result is written back and React is told, as if typed.
 */
import { evaluateMath } from '../mathEvaluator';

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Turns what was typed into something evaluateMath understands (× ÷ x, Arabic digits, comma). */
export function normalizeExpression(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[×xX]/g, '*')
    .replace(/÷/g, '/')
    .replace(/٫|,/g, '.')
    .replace(/^\s*=/, '')
    .trim();
}

/** True for "3*4", "=10/2", "2+3": an operator after a number, not just "-5". */
export function looksLikeExpression(raw: string): boolean {
  const s = normalizeExpression(raw);
  return /^[0-9+\-*/().\s]+$/.test(s) && /[0-9)]\s*[+\-*/]/.test(s);
}

/** The value to store, rounded to 4 decimals, or null when it isn't a valid expression. */
export function computeExpression(raw: string): string | null {
  if (!looksLikeExpression(raw)) return null;
  const res = evaluateMath(normalizeExpression(raw));
  if (res === null || !isFinite(res)) return null;
  return String(Number(res.toFixed(4)));
}

const OPERATOR_KEYS = ['+', '-', '*', '/', 'x', 'X', '×', '÷', '='];

const setNativeValue = (el: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

let installed = false;

/**
 * Typing an operator in a number field opens a small text box right over it (number fields
 * can't hold "3*"); Enter or leaving it writes the result into the field, Escape cancels.
 */
function openCalculator(field: HTMLInputElement, firstKey: string) {
  const rect = field.getBoundingClientRect();
  const box = document.createElement('input');
  box.type = 'text';
  box.id = 'math-calc-input';
  box.dir = 'ltr';
  box.autocomplete = 'off';
  box.value = (field.value || '') + (firstKey === '=' ? '' : firstKey);
  const cs = getComputedStyle(field);
  Object.assign(box.style, {
    position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`,
    width: `${Math.max(rect.width, 120)}px`, height: `${rect.height}px`,
    zIndex: '2147483000', boxSizing: 'border-box', padding: cs.padding,
    font: cs.font, fontFamily: 'ui-monospace, monospace', borderRadius: cs.borderRadius,
    border: '2px solid #2563EB', background: '#EFF6FF', color: '#0F172A', outline: 'none',
    boxShadow: '0 6px 18px rgba(37,99,235,.25)',
  } as Partial<CSSStyleDeclaration>);
  box.title = '= Enter';
  document.body.appendChild(box);
  box.focus();
  box.setSelectionRange(box.value.length, box.value.length);

  let done = false;
  const finish = (apply: boolean, refocus: boolean) => {
    if (done) return;
    done = true;
    const result = apply ? computeExpression(box.value) : null;
    const plain = apply && result === null && /^\s*-?\d+([.,]\d+)?\s*$/.test(normalizeExpression(box.value));
    box.remove();
    if (result !== null) setNativeValue(field, result);
    else if (plain) setNativeValue(field, normalizeExpression(box.value));
    if (refocus) field.focus();
  };
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(true, true); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false, true); }
    else if (e.key === 'Tab') { finish(true, false); }
  });
  box.addEventListener('blur', () => finish(true, false));
}

export function installMathInputs() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  window.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) || el.type !== 'number' || el.readOnly || el.disabled) return;
    if (e.ctrlKey || e.metaKey || e.altKey || !OPERATOR_KEYS.includes(e.key)) return;
    // a leading minus on an empty field is just a negative number
    if (e.key === '-' && (el.value === '' || el.value === '-')) return;
    e.preventDefault();
    e.stopPropagation();
    openCalculator(el, e.key);
  }, true);

  // On-screen keyboards (iPad) and pasted symbols may insert text without a matching key event
  window.addEventListener('beforeinput', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) || el.type !== 'number' || el.readOnly || el.disabled) return;
    const ch = (e as InputEvent).data || '';
    if (ch.length !== 1 || !OPERATOR_KEYS.includes(ch)) return;
    if (ch === '-' && (el.value === '' || el.value === '-')) return;
    e.preventDefault();
    openCalculator(el, ch);
  }, true);
}
