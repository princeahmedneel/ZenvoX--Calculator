/**
 * ZenvX - Calculator
 * File: js/math-engine/decimal-exact.js
 * Purpose: Exact arbitrary-precision Decimal Arithmetic Engine using BigInt scaling.
 *          Eliminates IEEE-754 floating-point errors (0.1 + 0.2 === 0.3),
 *          implements real-world calculator percentage behavior (100 + 10% = 110),
 *          safe division by zero detection, and built-in unit tests.
 */

import { toEnglishDigits } from '../config/i18n.js';

const SCALE_DIGITS = 18;
const SCALE_FACTOR = 10n ** BigInt(SCALE_DIGITS);

export class ExactDecimal {
  /**
   * @param {BigInt} scaledValue - Integer representation multiplied by 10^18
   */
  constructor(scaledValue) {
    this.scaled = BigInt(scaledValue);
  }

  /**
   * Parse a string or number into an ExactDecimal without float loss
   */
  static fromString(input) {
    if (input instanceof ExactDecimal) return input;
    const clean = toEnglishDigits(String(input ?? '0').trim()).replace(/,/g, '');
    if (!clean || clean === '+' || clean === '-') return new ExactDecimal(0n);

    // Handle scientific notation if passed (e.g. 1e-5)
    if (/e/i.test(clean)) {
      const num = Number(clean);
      if (!Number.isFinite(num)) throw new Error('MATH_ERROR');
      return ExactDecimal.fromString(num.toFixed(12));
    }

    let sign = 1n;
    let str = clean;
    if (str.startsWith('-') || str.startsWith('−')) {
      sign = -1n;
      str = str.slice(1);
    } else if (str.startsWith('+')) {
      str = str.slice(1);
    }

    if (!/^\d*(\.\d*)?$/.test(str) || str === '.') {
      throw new Error('SYNTAX_ERROR');
    }

    const [intPartRaw, fracPartRaw = ''] = str.split('.');
    const intPart = intPartRaw ? BigInt(intPartRaw) : 0n;

    const paddedFrac = (fracPartRaw + '0'.repeat(SCALE_DIGITS)).slice(0, SCALE_DIGITS);
    const fracPart = paddedFrac ? BigInt(paddedFrac) : 0n;

    const totalScaled = sign * (intPart * SCALE_FACTOR + fracPart);
    return new ExactDecimal(totalScaled);
  }

  add(other) {
    const b = ExactDecimal.fromString(other);
    return new ExactDecimal(this.scaled + b.scaled);
  }

  sub(other) {
    const b = ExactDecimal.fromString(other);
    return new ExactDecimal(this.scaled - b.scaled);
  }

  mul(other) {
    const b = ExactDecimal.fromString(other);
    const prod = this.scaled * b.scaled;
    // Round half away from zero
    const half = prod >= 0n ? SCALE_FACTOR / 2n : -(SCALE_FACTOR / 2n);
    return new ExactDecimal((prod + half) / SCALE_FACTOR);
  }

  div(other) {
    const b = ExactDecimal.fromString(other);
    if (b.scaled === 0n) {
      throw new Error('DIV_ZERO');
    }
    const num = this.scaled * SCALE_FACTOR;
    const half = (num >= 0n && b.scaled > 0n) || (num < 0n && b.scaled < 0n)
      ? b.scaled / 2n
      : -(b.scaled / 2n);
    return new ExactDecimal((num + half) / b.scaled);
  }

  isZero() {
    return this.scaled === 0n;
  }

  /**
   * Convert back to clean string without trailing decimal zeros
   */
  toString(maxDecimals = 12) {
    if (this.scaled === 0n) return '0';

    const negative = this.scaled < 0n;
    let absScaled = negative ? -this.scaled : this.scaled;

    // Round to maxDecimals
    const trimDigits = SCALE_DIGITS - maxDecimals;
    if (trimDigits > 0) {
      const factor = 10n ** BigInt(trimDigits);
      absScaled = ((absScaled + factor / 2n) / factor) * factor;
    }

    const intPart = absScaled / SCALE_FACTOR;
    const remPart = absScaled % SCALE_FACTOR;

    if (remPart === 0n) {
      return (negative ? '-' : '') + intPart.toString();
    }

    let fracStr = remPart.toString().padStart(SCALE_DIGITS, '0');
    fracStr = fracStr.slice(0, maxDecimals).replace(/0+$/, '');

    if (!fracStr) {
      return (negative ? '-' : '') + intPart.toString();
    }
    return `${negative ? '-' : ''}${intPart.toString()}.${fracStr}`;
  }
}

/**
 * Tokenize & Evaluate a Normal Calculator Expression with real-world % semantics:
 * - "100 + 10%" -> 100 + (100 * 10 / 100) = 110
 * - "200 - 15%" -> 200 - (200 * 15 / 100) = 170
 * - "500 × 20%" -> 500 * (20 / 100) = 100
 * - "50%"       -> 0.5
 */
export function evaluateNormalExpression(rawExpression) {
  const normalized = toEnglishDigits(String(rawExpression ?? ''))
    .replace(/,/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s+/g, '');

  if (!normalized) {
    return { ok: true, value: '0' };
  }

  // Strip trailing incomplete operator for live preview
  const cleanedExpr = normalized.replace(/[+\-*/.(]+$/, '');
  if (!cleanedExpr) {
    return { ok: true, value: '0' };
  }

  try {
    const tokens = tokenizeNormal(cleanedExpr);
    const resultDec = parseNormalExpression(tokens);
    return {
      ok: true,
      value: resultDec.toString(10)
    };
  } catch (err) {
    const code = err.message || 'SYNTAX_ERROR';
    return {
      ok: false,
      error: code
    };
  }
}

function tokenizeNormal(expr) {
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    // Check unary minus or plus at start or after '(' or operator
    if (
      (ch === '-' || ch === '+') &&
      (tokens.length === 0 ||
        tokens[tokens.length - 1].type === 'OP' ||
        tokens[tokens.length - 1].value === '(')
    ) {
      let numStr = ch;
      i++;
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        numStr += expr[i++];
      }
      if (numStr === '-' || numStr === '+') {
        // Standalone unary before parenthesis: -(3+2) -> -1 * (3+2)
        if (ch === '-') {
          tokens.push({ type: 'NUM', value: ExactDecimal.fromString('-1') });
          tokens.push({ type: 'OP', value: '*' });
        }
        continue;
      }
      tokens.push({ type: 'NUM', value: ExactDecimal.fromString(numStr) });
      continue;
    }

    if (/[\d.]/.test(ch)) {
      let numStr = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        numStr += expr[i++];
      }
      tokens.push({ type: 'NUM', value: ExactDecimal.fromString(numStr) });
      continue;
    }

    if (ch === '%') {
      tokens.push({ type: 'PERCENT', value: '%' });
      i++;
      continue;
    }

    if (ch === '(' || ch === ')') {
      // Implicit multiplication e.g. 5(2) or (2)(3)
      if (
        ch === '(' &&
        tokens.length > 0 &&
        (tokens[tokens.length - 1].type === 'NUM' ||
          tokens[tokens.length - 1].type === 'PERCENT' ||
          tokens[tokens.length - 1].value === ')')
      ) {
        tokens.push({ type: 'OP', value: '*' });
      }
      tokens.push({ type: 'PAREN', value: ch });
      i++;
      continue;
    }

    if (['+', '-', '*', '/'].includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    throw new Error('SYNTAX_ERROR');
  }

  return tokens;
}

function parseNormalExpression(tokens) {
  let pos = 0;
  const HUNDRED = ExactDecimal.fromString('100');

  function parseAddSub() {
    let left = parseMulDiv();

    while (pos < tokens.length && tokens[pos].type === 'OP' && (tokens[pos].value === '+' || tokens[pos].value === '-')) {
      const op = tokens[pos++].value;

      // Check if right operand is followed by '%' for commercial calculator behavior (A + B% = A + A*B/100)
      const rightStartPos = pos;
      let right = parseMulDiv();

      const wasPercentageRight =
        pos > rightStartPos && tokens[pos - 1] && tokens[pos - 1].wasPercentOfBase;

      if (wasPercentageRight) {
        // right currently holds B/100; multiply by base 'left'
        right = left.mul(right);
      }

      left = op === '+' ? left.add(right) : left.sub(right);
    }
    return left;
  }

  function parseMulDiv() {
    let left = parsePrimary();

    while (pos < tokens.length && tokens[pos].type === 'OP' && (tokens[pos].value === '*' || tokens[pos].value === '/')) {
      const op = tokens[pos++].value;
      const right = parsePrimary();
      left = op === '*' ? left.mul(right) : left.div(right);
    }
    return left;
  }

  function parsePrimary() {
    if (pos >= tokens.length) throw new Error('SYNTAX_ERROR');
    const tok = tokens[pos++];

    let val;
    if (tok.type === 'NUM') {
      val = tok.value;
    } else if (tok.type === 'PAREN' && tok.value === '(') {
      val = parseAddSub();
      if (pos < tokens.length && tokens[pos].type === 'PAREN' && tokens[pos].value === ')') {
        pos++;
      }
    } else {
      throw new Error('SYNTAX_ERROR');
    }

    // Postfix '%' operator
    if (pos < tokens.length && tokens[pos].type === 'PERCENT') {
      tokens[pos].wasPercentOfBase = true;
      pos++;
      val = val.div(HUNDRED);
    }

    return val;
  }

  const finalVal = parseAddSub();
  if (pos < tokens.length) {
    throw new Error('SYNTAX_ERROR');
  }
  return finalVal;
}

/**
 * Built-in Unit Test Suite for Step 2 (Addition, Subtraction, %, Division, Decimals, Large Numbers)
 */
export function runNormalCalculatorUnitTests() {
  const cases = [
    { expr: '0.1+0.2', expected: '0.3', desc: 'Exact Decimal 0.1 + 0.2' },
    { expr: '1.005-0.005', expected: '1', desc: 'Decimal Subtraction' },
    { expr: '100+10%', expected: '110', desc: 'Commercial Add Percentage (100 + 10%)' },
    { expr: '200-15%', expected: '170', desc: 'Commercial Sub Percentage (200 - 15%)' },
    { expr: '500×20%', expected: '100', desc: 'Multiply Percentage (500 × 20%)' },
    { expr: '15÷0', expected: 'DIV_ZERO', isError: true, desc: 'Division by Zero Guard' },
    { expr: '999999999999+1', expected: '1000000000000', desc: 'Large Number Precision' },
    { expr: '2(3+4)', expected: '14', desc: 'Parentheses & Implicit Multiplication' }
  ];

  const results = cases.map((tc) => {
    const res = evaluateNormalExpression(tc.expr);
    const passed = tc.isError ? (!res.ok && res.error === tc.expected) : (res.ok && res.value === tc.expected);
    return { ...tc, actual: res.ok ? res.value : res.error, passed };
  });

  return {
    total: results.length,
    passedCount: results.filter((r) => r.passed).length,
    results
  };
}
