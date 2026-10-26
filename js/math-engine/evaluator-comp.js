/**
 * ZenvX - Calculator
 * File: js/math-engine/evaluator-comp.js
 * Purpose: Complete COMP Mode Evaluator including Trigonometry (DEG/RAD/GRA),
 *          Hyperbolics, Logs, Factorials, nPr/nCr, Numerical Derivative (d/dx),
 *          Simpson's Rule Definite Integral (∫dx), Summation (Σ), Newton-Raphson SOLVE,
 *          Prime Factorization (FACT), DMS conversion, 40 Scientific Constants,
 *          and 40 Unit Conversions.
 */

import {
  tokenizeScientific,
  parseScientificTokens,
  detectExactSymbolicForm,
  gcdBigInt,
  lcmBigInt
} from './tokenizer-parser.js';

/**
 * 40 Built-in CODATA Scientific Constants (CONST Menu)
 */
export const SCIENTIFIC_CONSTANTS = [
  { id: '01', symbol: 'mp', name: 'Proton mass (প্রোটনের ভর)', value: 1.67262192369e-27, unit: 'kg' },
  { id: '02', symbol: 'mn', name: 'Neutron mass (নিউট্রনের ভর)', value: 1.67492749804e-27, unit: 'kg' },
  { id: '03', symbol: 'me', name: 'Electron mass (ইলেকট্রনের ভর)', value: 9.1093837015e-31, unit: 'kg' },
  { id: '04', symbol: 'mμ', name: 'Muon mass (মিউয়নের ভর)', value: 1.883531627e-28, unit: 'kg' },
  { id: '05', symbol: 'a0', name: 'Bohr radius (বোর ব্যাসার্ধ)', value: 5.29177210903e-11, unit: 'm' },
  { id: '06', symbol: 'h', name: 'Planck constant (প্ল্যাঙ্কের ধ্রুবক)', value: 6.62607015e-34, unit: 'J·s' },
  { id: '07', symbol: 'μN', name: 'Nuclear magneton (নিউক্লিয়ার ম্যাগনেটন)', value: 5.0507837461e-27, unit: 'J/T' },
  { id: '08', symbol: 'μB', name: 'Bohr magneton (বোর ম্যাগনেটন)', value: 9.2740100783e-24, unit: 'J/T' },
  { id: '09', symbol: 'ℏ', name: 'Reduced Planck constant (h/2π)', value: 1.054571817e-34, unit: 'J·s' },
  { id: '10', symbol: 'α', name: 'Fine-structure constant', value: 7.2973525693e-3, unit: '' },
  { id: '11', symbol: 're', name: 'Classical electron radius', value: 2.8179403262e-15, unit: 'm' },
  { id: '12', symbol: 'λc', name: 'Compton wavelength', value: 2.42631023867e-12, unit: 'm' },
  { id: '13', symbol: 'γp', name: 'Proton gyromagnetic ratio', value: 2.6752218744e8, unit: 's⁻¹T⁻¹' },
  { id: '14', symbol: 'λcp', name: 'Proton Compton wavelength', value: 1.32140985539e-15, unit: 'm' },
  { id: '15', symbol: 'λcn', name: 'Neutron Compton wavelength', value: 1.31959090581e-15, unit: 'm' },
  { id: '16', symbol: 'R∞', name: 'Rydberg constant (রিডবার্গ ধ্রুবক)', value: 10973731.56816, unit: 'm⁻¹' },
  { id: '17', symbol: 'u', name: 'Atomic mass constant (পারমাণবিক ভর একক)', value: 1.6605390666e-27, unit: 'kg' },
  { id: '18', symbol: 'μp', name: 'Proton magnetic moment', value: 1.41060679736e-26, unit: 'J/T' },
  { id: '19', symbol: 'μe', name: 'Electron magnetic moment', value: -9.2847647043e-24, unit: 'J/T' },
  { id: '20', symbol: 'μn', name: 'Neutron magnetic moment', value: -9.6623651e-27, unit: 'J/T' },
  { id: '21', symbol: 'μμ', name: 'Muon magnetic moment', value: -4.4904483e-26, unit: 'J/T' },
  { id: '22', symbol: 'F', name: 'Faraday constant (ফ্যারাডে ধ্রুবক)', value: 96485.33212, unit: 'C/mol' },
  { id: '23', symbol: 'e', name: 'Elementary charge (মৌলিক আধান)', value: 1.602176634e-19, unit: 'C' },
  { id: '24', symbol: 'NA', name: 'Avogadro constant (অ্যাভোগাড্রো সংখ্যা)', value: 6.02214076e23, unit: 'mol⁻¹' },
  { id: '25', symbol: 'k', name: 'Boltzmann constant (বোল্টজম্যান ধ্রুবক)', value: 1.380649e-23, unit: 'J/K' },
  { id: '26', symbol: 'Vm', name: 'Molar volume of ideal gas (STP)', value: 0.02271095464, unit: 'm³/mol' },
  { id: '27', symbol: 'R', name: 'Molar gas constant (মোলার গ্যাস ধ্রুবক)', value: 8.314462618, unit: 'J/(mol·K)' },
  { id: '28', symbol: 'c', name: 'Speed of light in vacuum (আলোর বেগ)', value: 299792458, unit: 'm/s' },
  { id: '29', symbol: 'C1', name: 'First radiation constant', value: 3.741771852e-16, unit: 'W·m²' },
  { id: '30', symbol: 'C2', name: 'Second radiation constant', value: 1.438776877e-2, unit: 'm·K' },
  { id: '31', symbol: 'σ', name: 'Stefan-Boltzmann constant', value: 5.670374419e-8, unit: 'W/(m²·K⁴)' },
  { id: '32', symbol: 'ε0', name: 'Electric constant (শূন্য মাধ্যমের ভেদনযোগ্যতা)', value: 8.8541878128e-12, unit: 'F/m' },
  { id: '33', symbol: 'μ0', name: 'Magnetic constant (চৌম্বক ধ্রুবক)', value: 1.25663706212e-6, unit: 'N/A²' },
  { id: '34', symbol: 'Φ0', name: 'Magnetic flux quantum', value: 2.067833848e-15, unit: 'Wb' },
  { id: '35', symbol: 'g', name: 'Standard gravity (অভিকর্ষজ ত্বরণ)', value: 9.80665, unit: 'm/s²' },
  { id: '36', symbol: 'G0', name: 'Conductance quantum', value: 7.748091729e-5, unit: 'S' },
  { id: '37', symbol: 'Z0', name: 'Characteristic impedance of vacuum', value: 376.730313668, unit: 'Ω' },
  { id: '38', symbol: 't', name: 'Celsius temperature zero (0°C in K)', value: 273.15, unit: 'K' },
  { id: '39', symbol: 'G', name: 'Newtonian constant of gravitation (মহাকর্ষীয় ধ্রুবক)', value: 6.67430e-11, unit: 'm³/(kg·s²)' },
  { id: '40', symbol: 'atm', name: 'Standard atmosphere (প্রমাণ বায়ুমণ্ডলীয় চাপ)', value: 101325, unit: 'Pa' }
];

/**
 * 40 Unit Conversions (CONV Menu)
 */
export const UNIT_CONVERSIONS = [
  { id: '01', label: 'in ▸ cm', factor: 2.54 },
  { id: '02', label: 'cm ▸ in', factor: 1 / 2.54 },
  { id: '03', label: 'ft ▸ m', factor: 0.3048 },
  { id: '04', label: 'm ▸ ft', factor: 1 / 0.3048 },
  { id: '05', label: 'yd ▸ m', factor: 0.9144 },
  { id: '06', label: 'm ▸ yd', factor: 1 / 0.9144 },
  { id: '07', label: 'mile ▸ km', factor: 1.609344 },
  { id: '08', label: 'km ▸ mile', factor: 1 / 1.609344 },
  { id: '09', label: 'n mile ▸ m', factor: 1852 },
  { id: '10', label: 'm ▸ n mile', factor: 1 / 1852 },
  { id: '11', label: 'acre ▸ m²', factor: 4046.8564224 },
  { id: '12', label: 'm² ▸ acre', factor: 1 / 4046.8564224 },
  { id: '13', label: 'gal (US) ▸ L', factor: 3.785411784 },
  { id: '14', label: 'L ▸ gal (US)', factor: 1 / 3.785411784 },
  { id: '15', label: 'gal (UK) ▸ L', factor: 4.54609 },
  { id: '16', label: 'L ▸ gal (UK)', factor: 1 / 4.54609 },
  { id: '17', label: 'pc ▸ km', factor: 3.085677581e13 },
  { id: '18', label: 'km ▸ pc', factor: 1 / 3.085677581e13 },
  { id: '19', label: 'km/h ▸ m/s', factor: 1 / 3.6 },
  { id: '20', label: 'm/s ▸ km/h', factor: 3.6 },
  { id: '21', label: 'oz ▸ g', factor: 28.349523125 },
  { id: '22', label: 'g ▸ oz', factor: 1 / 28.349523125 },
  { id: '23', label: 'lb ▸ kg', factor: 0.45359237 },
  { id: '24', label: 'kg ▸ lb', factor: 1 / 0.45359237 },
  { id: '25', label: 'atm ▸ Pa', factor: 101325 },
  { id: '26', label: 'Pa ▸ atm', factor: 1 / 101325 },
  { id: '27', label: 'mmHg ▸ Pa', factor: 133.322387415 },
  { id: '28', label: 'Pa ▸ mmHg', factor: 1 / 133.322387415 },
  { id: '29', label: 'hp ▸ kW', factor: 0.745699872 },
  { id: '30', label: 'kW ▸ hp', factor: 1 / 0.745699872 },
  { id: '31', label: 'kgf/cm² ▸ Pa', factor: 98066.5 },
  { id: '32', label: 'Pa ▸ kgf/cm²', factor: 1 / 98066.5 },
  { id: '33', label: 'kgf·m ▸ J', factor: 9.80665 },
  { id: '34', label: 'J ▸ kgf·m', factor: 1 / 9.80665 },
  { id: '35', label: 'lbf/in² (psi) ▸ kPa', factor: 6.894757293 },
  { id: '36', label: 'kPa ▸ lbf/in² (psi)', factor: 1 / 6.894757293 },
  { id: '37', label: '°F ▸ °C', fn: (f) => ((f - 32) * 5) / 9 },
  { id: '38', label: '°C ▸ °F', fn: (c) => (c * 9) / 5 + 32 },
  { id: '39', label: 'J ▸ cal', factor: 1 / 4.184 },
  { id: '40', label: 'cal ▸ J', factor: 4.184 }
];

/**
 * Angle Unit Conversion Helpers
 */
function toRadians(val, angleUnit = 'DEG') {
  if (angleUnit === 'DEG') return (val * Math.PI) / 180;
  if (angleUnit === 'GRA') return (val * Math.PI) / 200;
  return val;
}

function fromRadians(rad, angleUnit = 'DEG') {
  if (angleUnit === 'DEG') return (rad * 180) / Math.PI;
  if (angleUnit === 'GRA') return (rad * 200) / Math.PI;
  return rad;
}

/**
 * Factorial & Combinatorics
 */
export function factorial(n) {
  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
    throw new Error('Math ERROR');
  }
  if (n > 170) throw new Error('Math ERROR'); // Overflow limit for IEEE double
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

export function nPr(n, r) {
  if (n < 0 || r < 0 || r > n || Math.floor(n) !== n || Math.floor(r) !== r) {
    throw new Error('Math ERROR');
  }
  let res = 1;
  for (let i = 0; i < r; i++) res *= (n - i);
  return res;
}

export function nCr(n, r) {
  if (n < 0 || r < 0 || r > n || Math.floor(n) !== n || Math.floor(r) !== r) {
    throw new Error('Math ERROR');
  }
  const k = Math.min(r, n - r);
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res = (res * (n - k + i)) / i;
  }
  return Math.round(res);
}

/**
 * Prime Factorization (FACT key on fx-991ES/EX)
 * e.g., 360 -> "2³ × 3² × 5"
 */
export function primeFactorize(num) {
  const n0 = Math.round(Math.abs(num));
  if (!Number.isFinite(n0) || n0 < 2 || n0 > 9999999999) {
    throw new Error('Math ERROR');
  }

  let n = n0;
  const factors = [];

  for (let d = 2; d * d <= n; d += d === 2 ? 1 : 2) {
    if (n % d === 0) {
      let count = 0;
      while (n % d === 0) {
        count++;
        n = Math.floor(n / d);
      }
      factors.push({ prime: d, exp: count });
    }
  }
  if (n > 1) {
    factors.push({ prime: n, exp: 1 });
  }

  const supDigits = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  const toSup = (numVal) =>
    String(numVal)
      .split('')
      .map((c) => supDigits[Number(c)])
      .join('');

  const text = factors
    .map((f) => (f.exp === 1 ? `${f.prime}` : `${f.prime}${toSup(f.exp)}`))
    .join(' × ');

  const latex = factors
    .map((f) => (f.exp === 1 ? `${f.prime}` : `${f.prime}^{${f.exp}}`))
    .join(' \\times ');

  return { text: num < 0 ? `-${text}` : text, latex: num < 0 ? `-${latex}` : latex };
}

/**
 * Format decimal number into Degrees° Minutes' Seconds" (DMS)
 */
export function toDMSString(decimalDegrees) {
  if (!Number.isFinite(decimalDegrees)) throw new Error('Math ERROR');
  const sign = decimalDegrees < 0 ? '-' : '';
  const abs = Math.abs(decimalDegrees);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat + 1e-9);
  const sec = Number(((minFloat - min) * 60).toFixed(2));
  return `${sign}${deg}° ${min}′ ${sec}″`;
}

/**
 * Evaluate AST Node in COMP Mode
 */
export function evaluateAST(node, context) {
  const {
    angleUnit = 'DEG',
    variables = {},
    ans = 0,
    preAns = 0,
    depth = 0
  } = context;

  if (depth > 80) throw new Error('Stack ERROR');
  const nextCtx = { ...context, depth: depth + 1 };

  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Const': {
      if (node.name === 'π' || node.name === 'pi') return Math.PI;
      if (node.name === 'e') return Math.E;
      if (node.name === 'Ans') return Number(ans) || 0;
      if (node.name === 'PreAns') return Number(preAns) || 0;
      if (node.name === 'Ran#') return Number(Math.random().toFixed(3));
      throw new Error('Syntax ERROR');
    }

    case 'Var': {
      const val = variables[node.name];
      return val !== undefined ? Number(val) : 0;
    }

    case 'DMSNode': {
      const d = evaluateAST(node.deg, nextCtx);
      const m = evaluateAST(node.min, nextCtx);
      const s = evaluateAST(node.sec, nextCtx);
      const sign = d < 0 ? -1 : 1;
      return sign * (Math.abs(d) + m / 60 + s / 3600);
    }

    case 'Unary': {
      const v = evaluateAST(node.expr, nextCtx);
      return node.op === '-' ? -v : v;
    }

    case 'Postfix': {
      const v = evaluateAST(node.expr, nextCtx);
      if (node.op === '!') return factorial(v);
      if (node.op === '%') return v / 100;
      if (node.op === '²') return v * v;
      if (node.op === '³') return v * v * v;
      if (node.op === '^-1') {
        if (Math.abs(v) < 1e-15) throw new Error('Math ERROR');
        return 1 / v;
      }
      throw new Error('Syntax ERROR');
    }

    case 'Binary': {
      const l = evaluateAST(node.left, nextCtx);
      const r = evaluateAST(node.right, nextCtx);

      if (node.op === '+') return l + r;
      if (node.op === '-') return l - r;
      if (node.op === '*') return l * r;
      if (node.op === '/') {
        if (Math.abs(r) < 1e-15) throw new Error('Math ERROR');
        return l / r;
      }
      if (node.op === '÷R') {
        if (Math.round(r) === 0) throw new Error('Math ERROR');
        const q = Math.trunc(l / r);
        const rem = l - q * r;
        context.quotientRemainder = { q, r: rem };
        return q;
      }
      if (node.op === '^') {
        const res = Math.pow(l, r);
        if (!Number.isFinite(res)) throw new Error('Math ERROR');
        return res;
      }
      if (node.op === 'P') return nPr(l, r);
      if (node.op === 'C') return nCr(l, r);
      throw new Error('Syntax ERROR');
    }

    case 'Call': {
      const fn = node.name;
      const args = node.args;

      // Calculus & Multi-arg functions that bind variable X
      if (fn === 'deriv') {
        // deriv(f(X), a) -> Central difference derivative at X = a
        if (args.length < 2) throw new Error('Syntax ERROR');
        const x0 = evaluateAST(args[1], nextCtx);
        const h = Math.max(1e-6, Math.abs(x0) * 1e-6);
        const fPlus = evaluateAST(args[0], {
          ...nextCtx,
          variables: { ...variables, X: x0 + h }
        });
        const fMinus = evaluateAST(args[0], {
          ...nextCtx,
          variables: { ...variables, X: x0 - h }
        });
        return (fPlus - fMinus) / (2 * h);
      }

      if (fn === 'integ') {
        // integ(f(X), a, b) -> Composite Simpson's 1/3 Rule (N = 100)
        if (args.length < 3) throw new Error('Syntax ERROR');
        const a = evaluateAST(args[1], nextCtx);
        const b = evaluateAST(args[2], nextCtx);
        if (a === b) return 0;
        const N = 100;
        const h = (b - a) / N;
        const evalAt = (xVal) =>
          evaluateAST(args[0], {
            ...nextCtx,
            variables: { ...variables, X: xVal }
          });

        let sum = evalAt(a) + evalAt(b);
        for (let i = 1; i < N; i++) {
          const x = a + i * h;
          sum += (i % 2 === 1 ? 4 : 2) * evalAt(x);
        }
        return (h / 3) * sum;
      }

      if (fn === 'sigma') {
        // sigma(f(X), start, end)
        if (args.length < 3) throw new Error('Syntax ERROR');
        const start = Math.round(evaluateAST(args[1], nextCtx));
        const end = Math.round(evaluateAST(args[2], nextCtx));
        if (end < start || end - start > 10000) throw new Error('Math ERROR');
        let total = 0;
        for (let k = start; k <= end; k++) {
          total += evaluateAST(args[0], {
            ...nextCtx,
            variables: { ...variables, X: k }
          });
        }
        return total;
      }

      // Standard evaluated arguments
      const evalArgs = args.map((a) => evaluateAST(a, nextCtx));
      const v0 = evalArgs[0];
      const v1 = evalArgs[1];

      if (fn === 'sin') {
        const rad = toRadians(v0, angleUnit);
        const s = Math.sin(rad);
        return Math.abs(s) < 1e-15 ? 0 : s;
      }
      if (fn === 'cos') {
        const rad = toRadians(v0, angleUnit);
        const c = Math.cos(rad);
        return Math.abs(c) < 1e-15 ? 0 : c;
      }
      if (fn === 'tan') {
        if (angleUnit === 'DEG' && Math.abs((v0 % 180) - 90) < 1e-12) {
          throw new Error('Math ERROR');
        }
        const rad = toRadians(v0, angleUnit);
        return Math.tan(rad);
      }
      if (fn === 'asin') {
        if (v0 < -1 || v0 > 1) throw new Error('Math ERROR');
        return fromRadians(Math.asin(v0), angleUnit);
      }
      if (fn === 'acos') {
        if (v0 < -1 || v0 > 1) throw new Error('Math ERROR');
        return fromRadians(Math.acos(v0), angleUnit);
      }
      if (fn === 'atan') {
        return fromRadians(Math.atan(v0), angleUnit);
      }
      if (fn === 'sinh') return Math.sinh(v0);
      if (fn === 'cosh') return Math.cosh(v0);
      if (fn === 'tanh') return Math.tanh(v0);
      if (fn === 'asinh') return Math.asinh(v0);
      if (fn === 'acosh') {
        if (v0 < 1) throw new Error('Math ERROR');
        return Math.acosh(v0);
      }
      if (fn === 'atanh') {
        if (v0 <= -1 || v0 >= 1) throw new Error('Math ERROR');
        return Math.atanh(v0);
      }
      if (fn === 'log') {
        if (v0 <= 0) throw new Error('Math ERROR');
        return Math.log10(v0);
      }
      if (fn === 'ln') {
        if (v0 <= 0) throw new Error('Math ERROR');
        return Math.log(v0);
      }
      if (fn === 'logab') {
        if (evalArgs.length < 2 || v0 <= 0 || v0 === 1 || v1 <= 0) throw new Error('Math ERROR');
        return Math.log(v1) / Math.log(v0);
      }
      if (fn === 'sqrt') {
        if (v0 < 0) throw new Error('Math ERROR');
        return Math.sqrt(v0);
      }
      if (fn === 'cbrt') return Math.cbrt(v0);
      if (fn === 'root') {
        if (evalArgs.length < 2 || v0 === 0) throw new Error('Math ERROR');
        if (v1 < 0 && v0 % 2 === 0) throw new Error('Math ERROR');
        return v1 < 0 ? -Math.pow(-v1, 1 / v0) : Math.pow(v1, 1 / v0);
      }
      if (fn === 'abs') return Math.abs(v0);
      if (fn === 'Int') return Math.trunc(v0);
      if (fn === 'Frac') return v0 - Math.trunc(v0);
      if (fn === 'Rnd') return Number(v0.toPrecision(10));
      if (fn === 'GCD') {
        if (evalArgs.length < 2) throw new Error('Syntax ERROR');
        return Number(gcdBigInt(BigInt(Math.round(v0)), BigInt(Math.round(v1))));
      }
      if (fn === 'LCM') {
        if (evalArgs.length < 2) throw new Error('Syntax ERROR');
        return Number(lcmBigInt(BigInt(Math.round(v0)), BigInt(Math.round(v1))));
      }
      if (fn === 'RanInt') {
        if (evalArgs.length < 2) throw new Error('Syntax ERROR');
        const min = Math.ceil(Math.min(v0, v1));
        const max = Math.floor(Math.max(v0, v1));
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      if (fn === 'Pol') {
        if (evalArgs.length < 2) throw new Error('Syntax ERROR');
        const r = Math.hypot(v0, v1);
        const theta = fromRadians(Math.atan2(v1, v0), angleUnit);
        context.polarRectOutput = `r=${Number(r.toPrecision(8))}, θ=${Number(theta.toPrecision(8))}`;
        return r;
      }
      if (fn === 'Rec') {
        if (evalArgs.length < 2) throw new Error('Syntax ERROR');
        const rad = toRadians(v1, angleUnit);
        const x = v0 * Math.cos(rad);
        const y = v0 * Math.sin(rad);
        context.polarRectOutput = `X=${Number(x.toPrecision(8))}, Y=${Number(y.toPrecision(8))}`;
        return x;
      }

      throw new Error('Syntax ERROR');
    }

    default:
      throw new Error('Syntax ERROR');
  }
}

/**
 * Format numeric result according to SETUP (FIX, SCI, NORM1, NORM2, ENG)
 */
export function formatSciNumber(val, setup = {}) {
  if (!Number.isFinite(val)) throw new Error('Math ERROR');
  const clean = Math.abs(val) < 1e-14 ? 0 : Number(val.toPrecision(12));

  const {
    numberFormat = 'NORM1',
    fixDecimals = 4,
    sciSigFigs = 5
  } = setup;

  if (numberFormat === 'FIX') {
    return clean.toFixed(fixDecimals);
  }
  if (numberFormat === 'SCI') {
    return clean.toExponential(Math.max(1, sciSigFigs - 1)).replace('e+', '×10^').replace('e', '×10^');
  }

  // NORM1 triggers exponential for |x| < 10^-2 or |x| >= 10^10; NORM2 for |x| < 10^-9
  const lowerThreshold = numberFormat === 'NORM2' ? 1e-9 : 1e-2;
  if (clean !== 0 && (Math.abs(clean) < lowerThreshold || Math.abs(clean) >= 1e10)) {
    return clean.toExponential(8).replace(/\.?0+e/, 'e').replace('e+', '×10^').replace('e', '×10^');
  }

  return String(clean);
}

/**
 * Format value in Engineering Notation (exponent is a multiple of 3: 10^3, 10^6, 10^-3, etc.)
 */
export function formatEngNotation(val, shiftSteps = 0) {
  if (val === 0) return '0×10⁰';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  let exp3 = Math.floor(Math.log10(abs) / 3) * 3 - shiftSteps * 3;
  const mantissa = abs / Math.pow(10, exp3);
  return `${sign}${Number(mantissa.toPrecision(8))}×10^(${exp3})`;
}

/**
 * Main Entry Point to Evaluate a Scientific COMP Expression
 */
export function evaluateCompExpression(rawExpr, options = {}) {
  try {
    const tokens = tokenizeScientific(rawExpr);
    const ast = parseScientificTokens(tokens);

    const context = {
      angleUnit: options.angleUnit || 'DEG',
      variables: options.variables || {},
      ans: options.ans || 0,
      preAns: options.preAns || 0
    };

    const numericValue = evaluateAST(ast, context);
    if (!Number.isFinite(numericValue)) {
      throw new Error('Math ERROR');
    }

    const decimalText = formatSciNumber(numericValue, options);
    const symbolic = detectExactSymbolicForm(numericValue, options.fractionFormat || 'IMPROPER');

    let specialText = null;
    if (context.quotientRemainder) {
      specialText = `Q=${context.quotientRemainder.q}, R=${context.quotientRemainder.r}`;
    } else if (context.polarRectOutput) {
      specialText = context.polarRectOutput;
    }

    return {
      ok: true,
      numeric: numericValue,
      decimalText,
      symbolicText: specialText || (symbolic ? symbolic.text : decimalText),
      symbolicLatex: symbolic ? symbolic.latex : decimalText,
      hasSymbolic: Boolean(symbolic && symbolic.text !== decimalText)
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message || 'Syntax ERROR'
    };
  }
}

/**
 * SOLVE Engine (Newton-Raphson Root Finder for Equations in X)
 */
export function solveEquationForX(rawExpr, initialGuess = 1, options = {}) {
  try {
    const tokens = tokenizeScientific(rawExpr);
    const ast = parseScientificTokens(tokens);

    let x = Number(initialGuess);
    if (!Number.isFinite(x)) x = 1;

    const evalF = (xVal) =>
      evaluateAST(ast, {
        angleUnit: options.angleUnit || 'DEG',
        variables: { ...(options.variables || {}), X: xVal },
        ans: options.ans || 0
      });

    for (let iter = 0; iter < 80; iter++) {
      const fx = evalF(x);
      if (Math.abs(fx) < 1e-11) {
        return { ok: true, root: Number(x.toPrecision(10)), residual: 0 };
      }
      const h = Math.max(1e-7, Math.abs(x) * 1e-7);
      const dfx = (evalF(x + h) - evalF(x - h)) / (2 * h);
      if (Math.abs(dfx) < 1e-14) {
        x += 0.5; // Perturb away from stationary point
        continue;
      }
      const nextX = x - fx / dfx;
      if (Math.abs(nextX - x) < 1e-11) {
        return { ok: true, root: Number(nextX.toPrecision(10)), residual: evalF(nextX) };
      }
      x = nextX;
    }

    const finalResidual = evalF(x);
    if (Math.abs(finalResidual) < 1e-5) {
      return { ok: true, root: Number(x.toPrecision(8)), residual: finalResidual };
    }
    return { ok: false, error: 'Cannot Solve (No Real Root Found)' };
  } catch (err) {
    return { ok: false, error: err.message || 'Syntax ERROR' };
  }
}
