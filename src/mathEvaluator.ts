/**
 * Safely evaluates mathematical expressions (e.g., "=4/2" or "100 + 50 * 0.15")
 * without using eval() or Function() constructor to ensure complete security.
 */

export function evaluateMath(input: string): number | null {
  let str = input.trim();
  if (str.startsWith('=')) {
    str = str.substring(1).trim();
  }

  if (!str) return null;

  // Enforce safe math characters only
  if (!/^[0-9+\-*/().\s]+$/.test(str)) {
    return null;
  }

  try {
    let index = 0;

    const peek = () => str[index];
    const consume = () => str[index++];

    const parseNumber = (): number => {
      let numStr = '';
      while (peek() && /[0-9.]/.test(peek())) {
        numStr += consume();
      }
      if (!numStr) throw new Error('Expected number');
      return parseFloat(numStr);
    };

    const parsePrimary = (): number => {
      while (peek() === ' ') consume();
      if (peek() === '(') {
        consume(); // '('
        const val = parseExpr();
        while (peek() === ' ') consume();
        if (peek() === ')') {
          consume(); // ')'
        }
        return val;
      }
      if (peek() === '-') {
        consume();
        return -parsePrimary();
      }
      if (peek() === '+') {
        consume();
        return parsePrimary();
      }
      return parseNumber();
    };

    const parseTerm = (): number => {
      let val = parsePrimary();
      while (true) {
        while (peek() === ' ') consume();
        const op = peek();
        if (op === '*' || op === '/') {
          consume();
          const nextVal = parsePrimary();
          if (op === '*') val *= nextVal;
          else {
            if (nextVal === 0) throw new Error('Division by zero');
            val /= nextVal;
          }
        } else {
          break;
        }
      }
      return val;
    };

    const parseExpr = (): number => {
      let val = parseTerm();
      while (true) {
        while (peek() === ' ') consume();
        const op = peek();
        if (op === '+' || op === '-') {
          consume();
          const nextVal = parseTerm();
          if (op === '+') val += nextVal;
          else val -= nextVal;
        } else {
          break;
        }
      }
      return val;
    };

    const result = parseExpr();
    if (index < str.length) {
      return null; // extra token/invalid syntax
    }
    return isNaN(result) ? null : result;
  } catch {
    return null;
  }
}

/**
 * Clean numeric string representation of parsed content.
 * Accepts any raw input string, attempts parsing if it has math characters,
 * and outputs either the computed string or the original clean characters.
 */
export function evaluateInput(val: string): string {
  if (val.includes('=') || /[+\-*/()]/.test(val)) {
    const res = evaluateMath(val);
    if (res !== null) {
      return Number(res.toFixed(4)).toString();
    }
  }
  return val;
}

/**
 * Common React Change/Blur/Keydown utilities for input elements
 */
export function handleMathBlur(
  val: string,
  setter: (newVal: string) => void,
  callback?: (numValue: number) => void
) {
  if (val.trim().startsWith('=')) {
    const res = evaluateMath(val);
    if (res !== null) {
      const cleanVal = Number(res.toFixed(4)).toString();
      setter(cleanVal);
      if (callback) callback(res);
    }
  }
}

export function handleMathKeyDown(
  e: any, // Use any or KeyboardEvent to prevent strict type conflicts in different packages
  val: string,
  setter: (newVal: string) => void,
  callback?: (numValue: number) => void
) {
  if (e.key === 'Enter') {
    handleMathBlur(val, setter, callback);
  }
}
