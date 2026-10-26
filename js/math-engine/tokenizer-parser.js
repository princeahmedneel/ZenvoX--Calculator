/**
 * ZenvX - Calculator
 * File: js/math-engine/tokenizer-parser.js
 * Purpose: Exact BigInt Rational Fraction Engine, Surd/Radical representation,
 *          S<=>D toggle formatter, Lexer/Tokenizer with implicit multiplication
 *          (2π, 3sin(30), (2)(3), 5A), and Recursive Descent AST Parser.
 */

import { toEnglishDigits } from '../config/i18n.js';

/**
 * Greatest Common Divisor for BigInt
 */
export function gcdBigInt(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x === 0n ? 1n : x;
}

/**
 * Least Common Multiple for BigInt
 */
export function lcmBigInt(a, b) {
  if (a === 0n || b === 0n) return 0n;
  const absA = a < 0n ? -a : a;
  const absB = b < 0n ? -b : b;
  return (absA / gcdBigInt(absA, absB)) * absB;
}

/**
 * Exact Rational Fraction (num / den) using BigInt
 */
export class Rational {
  constructor(num, den = 1n) {
    let n = BigInt(num);
    let d = BigInt(den);
    if (d === 0n) throw new Error('Math ERROR');
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcdBigInt(n, d);
    this.num = n / g;
    this.den = d / g;
  }

  static fromNumber(val, maxDenom = 1000000) {
    if (!Number.isFinite(val)) throw new Error('Math ERROR');
    if (Number.isInteger(val) && Math.abs(val) < 1e15) {
      return new Rational(BigInt(Math.round(val)), 1n);
    }

    // Continued fraction approximation for exact rational conversion
    const sign = val < 0 ? -1n : 1n;
    let x = Math.abs(val);
    let h1 = 1n, h2 = 0n;
    let k1 = 0n, k2 = 1n;
    let b = x;

    for (let i = 0; i < 28; i++) {
      const a = BigInt(Math.floor(b));
      const h = a * h1 + h2;
      const k = a * k1 + k2;
      if (k > BigInt(maxDenom)) break;
      h2 = h1; h1 = h;
      k2 = k1; k1 = k;
      const rem = b - Number(a);
      if (Math.abs(rem) < 1e-12) break;
      b = 1 / rem;
    }

    const approx = Number(h1) / Number(k1);
    if (Math.abs(approx - Math.abs(val)) < 1e-10) {
      return new Rational(sign * h1, k1);
    }
    return null;
  }

  toNumber() {
    return Number(this.num) / Number(this.den);
  }

  toImproperString() {
    if (this.den === 1n) return this.num.toString();
    return `${this.num.toString()}/${this.den.toString()}`;
  }

  toMixedString() {
    if (this.den === 1n) return this.num.toString();
    const neg = this.num < 0n;
    const absNum = neg ? -this.num : this.num;
    if (absNum < this.den) {
      return `${this.num.toString()}/${this.den.toString()}`;
    }
    const whole = absNum / this.den;
    const rem = absNum % this.den;
    if (rem === 0n) return (neg ? '-' : '') + whole.toString();
    return `${neg ? '-' : ''}${whole.toString()} ${rem.toString()}/${this.den.toString()}`;
  }

  toLatex(mixed = false) {
    if (this.den === 1n) return this.num.toString();
    const neg = this.num < 0n;
    const absNum = neg ? -this.num : this.num;
    if (mixed && absNum > this.den) {
      const whole = absNum / this.den;
      const rem = absNum % this.den;
      return `${neg ? '-' : ''}${whole}\\frac{${rem}}{${this.den}}`;
    }
    return `${neg ? '-' : ''}\\frac{${absNum}}{${this.den}}`;
  }
}

/**
 * Attempt to detect exact symbolic forms:
 * - Rational fraction (a/b)
 * - Square root surd (a√b / c)
 * - Pi multiple (aπ / b)
 */
export function detectExactSymbolicForm(val, fractionFormat = 'IMPROPER') {
  if (!Number.isFinite(val)) return null;
  if (Math.abs(val) < 1e-14) return { type: 'INT', text: '0', latex: '0' };

  // 1. Check Rational Fraction
  const rat = Rational.fromNumber(val, 10000);
  if (rat && rat.den <= 999n) {
    const isMixed = fractionFormat === 'MIXED';
    return {
      type: 'FRAC',
      rational: rat,
      text: isMixed ? rat.toMixedString() : rat.toImproperString(),
      latex: rat.toLatex(isMixed)
    };
  }

  // 2. Check Multiple of Pi: (a/b) * π
  const piRatio = val / Math.PI;
  const piRat = Rational.fromNumber(piRatio, 120);
  if (piRat && piRat.den <= 36n && piRat.num !== 0n) {
    const n = piRat.num;
    const d = piRat.den;
    const coef = n === 1n ? '' : n === -1n ? '-' : n.toString();
    const text = d === 1n ? `${coef}π` : `${coef}π/${d}`;
    const latex = d === 1n ? `${coef}\\pi` : `\\frac{${coef}\\pi}{${d}}`;
    return { type: 'PI', text, latex };
  }

  // 3. Check Simple Radical Surd: (a/c) * √b for square-free b <= 50
  const squareFreeList = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30];
  for (const b of squareFreeList) {
    const rootB = Math.sqrt(b);
    const ratio = val / rootB;
    const surdRat = Rational.fromNumber(ratio, 60);
    if (surdRat && surdRat.den <= 24n && surdRat.num !== 0n) {
      const n = surdRat.num;
      const d = surdRat.den;
      const coef = n === 1n ? '' : n === -1n ? '-' : n.toString();
      const text = d === 1n ? `${coef}√(${b})` : `${coef}√(${b})/${d}`;
      const latex = d === 1n ? `${coef}\\sqrt{${b}}` : `\\frac{${coef}\\sqrt{${b}}}{${d}}`;
      return { type: 'SURD', text, latex };
    }
  }

  return null;
}

/**
 * Recognized Function Names in Scientific Calculator
 */
const SCI_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'log', 'ln', 'sqrt', 'cbrt', 'abs', 'Pol', 'Rec',
  'RanInt', 'GCD', 'LCM', 'Int', 'Frac', 'Rnd',
  ' logab', 'root', 'deriv', 'integ', 'sigma', 'arg', 'conjg'
]);

const SCI_CONSTANTS = new Set(['π', 'pi', 'e', 'Ans', 'PreAns', 'Ran#', 'i']);
const SCI_VARIABLES = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'X', 'Y', 'M']);

/**
 * Tokenizer for Scientific Expressions with Implicit Multiplication
 */
export function tokenizeScientific(rawExpr) {
  let expr = toEnglishDigits(String(rawExpr ?? ''))
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/√\(/g, 'sqrt(')
    .replace(/³√\(/g, 'cbrt(')
    .replace(/sin⁻¹\(/g, 'asin(')
    .replace(/cos⁻¹\(/g, 'acos(')
    .replace(/tan⁻¹\(/g, 'atan(')
    .replace(/sinh⁻¹\(/g, 'asinh(')
    .replace(/cosh⁻¹\(/g, 'acosh(')
    .replace(/tanh⁻¹\(/g, 'atanh(')
    .replace(/logₐ\(/g, 'logab(')
    .replace(/ⁿ√\(/g, 'root(')
    .replace(/d\/dx\(/g, 'deriv(')
    .replace(/∫\(/g, 'integ(')
    .replace(/Σ\(/g, 'sigma(')
    .replace(/×10\^/g, '*10^');

  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number literal (including scientific notation 1.5e-3)
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(expr[i + 1] || ''))) {
      let numStr = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        numStr += expr[i++];
      }
      if ((numStr.match(/\./g) || []).length > 1) {
        throw new Error('Syntax ERROR');
      }
      tokens.push({ type: 'NUMBER', value: Number(numStr), raw: numStr });
      continue;
    }

    // Special symbol π or Ran#
    if (expr.startsWith('Ran#', i)) {
      tokens.push({ type: 'CONST', value: 'Ran#' });
      i += 4;
      continue;
    }
    if (ch === 'π') {
      tokens.push({ type: 'CONST', value: 'π' });
      i++;
      continue;
    }

    // Multi-character operators: nPr, nCr, ÷R (Quotient+Remainder), ∠ (Polar angle)
    if (expr.startsWith('÷R', i)) {
      tokens.push({ type: 'OP', value: '÷R' });
      i += 2;
      continue;
    }
    if (ch === 'P' || ch === 'C') {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }
    if (ch === '∠') {
      tokens.push({ type: 'OP', value: '∠' });
      i++;
      continue;
    }
    if (ch === '°') {
      tokens.push({ type: 'DMS', value: '°' });
      i++;
      continue;
    }

    // Identifiers (Functions, Constants, Variables A-F, X, Y, M)
    if (/[a-zA-Z]/.test(ch)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        ident += expr[i++];
      }

      if (SCI_FUNCTIONS.has(ident)) {
        tokens.push({ type: 'FUNC', value: ident });
      } else if (SCI_CONSTANTS.has(ident)) {
        tokens.push({ type: 'CONST', value: ident });
      } else if (SCI_VARIABLES.has(ident)) {
        tokens.push({ type: 'VAR', value: ident });
      } else {
        // Handle adjacent variables like "2X" or "AB" by splitting single-char variables
        for (const c of ident) {
          if (SCI_VARIABLES.has(c)) {
            tokens.push({ type: 'VAR', value: c });
          } else if (c === 'e' || c === 'i') {
            tokens.push({ type: 'CONST', value: c });
          } else {
            throw new Error('Syntax ERROR');
          }
        }
      }
      continue;
    }

    // Postfix operators: ! (Factorial), % (Percent), ² (Square), ³ (Cube), ⁻¹ (Reciprocal)
    if (expr.startsWith('⁻¹', i)) {
      tokens.push({ type: 'POSTFIX', value: '^-1' });
      i += 2;
      continue;
    }
    if (ch === '!' || ch === '%' || ch === '²' || ch === '³') {
      tokens.push({ type: 'POSTFIX', value: ch });
      i++;
      continue;
    }

    // Parentheses & Comma
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'PAREN', value: ch });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    // Standard Binary/Unary Operators
    if (['+', '-', '*', '/', '^', '='].includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    throw new Error('Syntax ERROR');
  }

  // Insert Implicit Multiplication tokens where appropriate:
  // e.g., 2π -> 2 * π, 3sin(x) -> 3 * sin(x), (2)(3) -> (2) * (3), 2X -> 2 * X
  const expanded = [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const curr = tokens[idx];
    expanded.push(curr);

    if (idx + 1 < tokens.length) {
      const next = tokens[idx + 1];
      const leftCanMultiply =
        curr.type === 'NUMBER' ||
        curr.type === 'CONST' ||
        curr.type === 'VAR' ||
        curr.type === 'POSTFIX' ||
        (curr.type === 'PAREN' && curr.value === ')');

      const rightCanMultiply =
        next.type === 'FUNC' ||
        next.type === 'CONST' ||
        next.type === 'VAR' ||
        (next.type === 'PAREN' && next.value === '(') ||
        (next.type === 'NUMBER' && (curr.type === 'CONST' || curr.type === 'VAR' || curr.type === 'POSTFIX' || curr.value === ')'));

      if (leftCanMultiply && rightCanMultiply) {
        expanded.push({ type: 'OP', value: '*', implicit: true });
      }
    }
  }

  return expanded;
}

/**
 * Recursive Descent Parser -> Builds an Abstract Syntax Tree (AST)
 * Precedence (lowest to highest):
 * 1. '=' (Equation relation)
 * 2. '+', '-'
 * 3. '*', '/', '÷R'
 * 4. 'P' (nPr), 'C' (nCr), '∠'
 * 5. Unary '+', '-'
 * 6. '^' (Right-associative power)
 * 7. Postfix ('!', '%', '²', '³', '^-1', DMS '°')
 * 8. Primary (Numbers, Constants, Variables, Functions, Parentheses)
 */
export function parseScientificTokens(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos] || null;
  }

  function consume() {
    return tokens[pos++];
  }

  function parseEquality() {
    let left = parseAddSub();
    while (peek() && peek().type === 'OP' && peek().value === '=') {
      consume();
      const right = parseAddSub();
      // Represent A = B as A - (B) for SOLVE engine
      left = { type: 'Binary', op: '-', left, right };
    }
    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek() && peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = parseMulDiv();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  function parseMulDiv() {
    let left = parseCombinatorics();
    while (
      peek() &&
      peek().type === 'OP' &&
      (peek().value === '*' || peek().value === '/' || peek().value === '÷R')
    ) {
      const op = consume().value;
      const right = parseCombinatorics();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  function parseCombinatorics() {
    let left = parseUnary();
    while (
      peek() &&
      peek().type === 'OP' &&
      (peek().value === 'P' || peek().value === 'C' || peek().value === '∠')
    ) {
      const op = consume().value;
      const right = parseUnary();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  function parseUnary() {
    if (peek() && peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const expr = parseUnary();
      return op === '-' ? { type: 'Unary', op: '-', expr } : expr;
    }
    return parsePower();
  }

  function parsePower() {
    let base = parsePostfix();
    if (peek() && peek().type === 'OP' && peek().value === '^') {
      consume();
      const exponent = parseUnary(); // Right-associative: 2^3^2 = 2^(3^2)
      return { type: 'Binary', op: '^', left: base, right: exponent };
    }
    return base;
  }

  function parsePostfix() {
    let node = parsePrimary();

    while (peek() && (peek().type === 'POSTFIX' || peek().type === 'DMS')) {
      if (peek().type === 'POSTFIX') {
        const op = consume().value;
        node = { type: 'Postfix', op, expr: node };
      } else if (peek().type === 'DMS') {
        // Parse Degrees°Minutes°Seconds° e.g., 12°30°45°
        consume();
        let mins = { type: 'Literal', value: 0 };
        let secs = { type: 'Literal', value: 0 };

        if (peek() && (peek().type === 'NUMBER' || peek().type === 'PAREN')) {
          mins = parsePrimary();
          if (peek() && peek().type === 'DMS') {
            consume();
            if (peek() && (peek().type === 'NUMBER' || peek().type === 'PAREN')) {
              secs = parsePrimary();
              if (peek() && peek().type === 'DMS') consume();
            }
          }
        }
        node = { type: 'DMSNode', deg: node, min: mins, sec: secs };
      }
    }

    return node;
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new Error('Syntax ERROR');

    if (tok.type === 'NUMBER') {
      consume();
      return { type: 'Literal', value: tok.value, raw: tok.raw };
    }

    if (tok.type === 'CONST') {
      consume();
      return { type: 'Const', name: tok.value };
    }

    if (tok.type === 'VAR') {
      consume();
      return { type: 'Var', name: tok.value };
    }

    if (tok.type === 'FUNC') {
      const fnName = consume().value;
      if (!peek() || peek().type !== 'PAREN' || peek().value !== '(') {
        throw new Error('Syntax ERROR');
      }
      consume(); // '('
      const args = [];
      if (!peek() || !(peek().type === 'PAREN' && peek().value === ')')) {
        args.push(parseEquality());
        while (peek() && peek().type === 'COMMA') {
          consume();
          args.push(parseEquality());
        }
      }
      // Allow auto-closing parenthesis at end of expression like real fx-991ES
      if (peek() && peek().type === 'PAREN' && peek().value === ')') {
        consume();
      }
      return { type: 'Call', name: fnName, args };
    }

    if (tok.type === 'PAREN' && tok.value === '(') {
      consume();
      const inside = parseEquality();
      if (peek() && peek().type === 'PAREN' && peek().value === ')') {
        consume();
      }
      return inside;
    }

    throw new Error('Syntax ERROR');
  }

  if (tokens.length === 0) {
    return { type: 'Literal', value: 0, raw: '0' };
  }

  const ast = parseEquality();
  if (pos < tokens.length) {
    throw new Error('Syntax ERROR');
  }
  return ast;
}
