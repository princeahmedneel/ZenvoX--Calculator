/**
 * ZenvX - Calculator
 * File: js/math-engine/modes-engine.js
 * Purpose: Complete Mathematical Engines for all 11 specialized Scientific Modes:
 *          1. CMPLX (Complex Numbers)
 *          2. STAT (1-Var & 7 Regression Models)
 *          3. BASE-N (DEC/HEX/BIN/OCT & Bitwise Logic)
 *          4. EQN (2x2, 3x3 Linear Systems & Quadratic/Cubic Polynomials)
 *          5. MATRIX (Up to 3x3: Add, Sub, Mul, Det, Transpose, Inverse, Identity, Abs)
 *          6. VECTOR (2D/3D: Dot, Cross, Magnitude, Angle, Unit Vector)
 *          7. TABLE (f(x) and g(x) step table generator)
 *          8. DISTRIBUTION (Normal, Binomial, Poisson: PD, CD, Inverse)
 *          9. INEQUALITY (2nd to 4th degree polynomial inequalities)
 *          10. RATIO (a:b = X:d & a:X = c:d)
 *          11. SPREADSHEET (5x4 cell grid with SUM/MEAN/MIN/MAX formulas)
 */

import { evaluateCompExpression, factorial, nCr } from './evaluator-comp.js';

/* ==========================================================================
   1. CMPLX MODE ENGINE (Complex Numbers: a + bi & r∠θ)
   ========================================================================== */
export class ComplexNumber {
  constructor(re = 0, im = 0) {
    this.re = Number(re) || 0;
    this.im = Number(im) || 0;
  }

  static fromPolar(r, thetaDeg) {
    const rad = (thetaDeg * Math.PI) / 180;
    return new ComplexNumber(r * Math.cos(rad), r * Math.sin(rad));
  }

  add(b) {
    return new ComplexNumber(this.re + b.re, this.im + b.im);
  }

  sub(b) {
    return new ComplexNumber(this.re - b.re, this.im - b.im);
  }

  mul(b) {
    return new ComplexNumber(
      this.re * b.re - this.im * b.im,
      this.re * b.im + this.im * b.re
    );
  }

  div(b) {
    const denom = b.re * b.re + b.im * b.im;
    if (denom === 0) throw new Error('Math ERROR');
    return new ComplexNumber(
      (this.re * b.re + this.im * b.im) / denom,
      (this.im * b.re - this.re * b.im) / denom
    );
  }

  abs() {
    return Math.hypot(this.re, this.im);
  }

  argDeg() {
    return (Math.atan2(this.im, this.re) * 180) / Math.PI;
  }

  conj() {
    return new ComplexNumber(this.re, -this.im);
  }

  toRectangularString() {
    const r = Number(this.re.toPrecision(8));
    const i = Number(this.im.toPrecision(8));
    if (i === 0) return `${r}`;
    if (r === 0) return `${i}i`;
    return `${r} ${i >= 0 ? '+' : '−'} ${Math.abs(i)}i`;
  }

  toPolarString() {
    const r = Number(this.abs().toPrecision(8));
    const ang = Number(this.argDeg().toPrecision(8));
    return `${r} ∠ ${ang}°`;
  }
}

/* ==========================================================================
   2. STAT MODE ENGINE (1-Var & 7 Regression Models)
   ========================================================================== */
export function computeOneVarStats(values = [], freqs = null) {
  if (!values.length) throw new Error('Math ERROR');
  let n = 0;
  let sumX = 0;
  let sumX2 = 0;
  const expanded = [];

  for (let i = 0; i < values.length; i++) {
    const x = Number(values[i]);
    const f = freqs ? Math.max(1, Number(freqs[i] || 1)) : 1;
    n += f;
    sumX += x * f;
    sumX2 += x * x * f;
    for (let k = 0; k < f; k++) expanded.push(x);
  }

  if (n === 0) throw new Error('Math ERROR');
  expanded.sort((a, b) => a - b);

  const mean = sumX / n;
  const popVar = Math.max(0, sumX2 / n - mean * mean);
  const sigma = Math.sqrt(popVar);
  const sampleS = n > 1 ? Math.sqrt((popVar * n) / (n - 1)) : 0;

  const median = (arr) => {
    const m = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
  };

  const med = median(expanded);
  const half = Math.floor(expanded.length / 2);
  const q1 = expanded.length > 1 ? median(expanded.slice(0, half)) : expanded[0];
  const q3 = expanded.length > 1 ? median(expanded.slice(expanded.length % 2 === 0 ? half : half + 1)) : expanded[0];

  return {
    n,
    mean: Number(mean.toPrecision(8)),
    sumX: Number(sumX.toPrecision(8)),
    sumX2: Number(sumX2.toPrecision(8)),
    sigma: Number(sigma.toPrecision(8)),
    sampleS: Number(sampleS.toPrecision(8)),
    minX: expanded[0],
    q1: Number(q1.toPrecision(8)),
    med: Number(med.toPrecision(8)),
    q3: Number(q3.toPrecision(8)),
    maxX: expanded[expanded.length - 1]
  };
}

/**
 * 2-Variable Regression Engine:
 * Models: 'LINEAR' (A+BX), 'QUAD' (A+BX+CX²), 'LN' (A+B·lnX),
 *         'EXP_E' (A·e^(BX)), 'EXP_AB' (A·B^X), 'POWER' (A·X^B), 'INV' (A+B/X)
 */
export function computeRegressionStats(xList = [], yList = [], model = 'LINEAR') {
  const n = Math.min(xList.length, yList.length);
  if (n < 2) throw new Error('Math ERROR');

  // Linear least squares helper on transformed variables (u, v)
  const fitLinearUV = (uArr, vArr) => {
    let sumU = 0, sumV = 0, sumU2 = 0, sumV2 = 0, sumUV = 0;
    for (let i = 0; i < n; i++) {
      const u = uArr[i];
      const v = vArr[i];
      sumU += u; sumV += v;
      sumU2 += u * u; sumV2 += v * v;
      sumUV += u * v;
    }
    const denom = n * sumU2 - sumU * sumU;
    if (Math.abs(denom) < 1e-15) throw new Error('Math ERROR');
    const B = (n * sumUV - sumU * sumV) / denom;
    const A = (sumV - B * sumU) / n;
    const rDenom = Math.sqrt((n * sumU2 - sumU * sumU) * (n * sumV2 - sumV * sumV));
    const r = rDenom === 0 ? 0 : (n * sumUV - sumU * sumV) / rDenom;
    return { A, B, r };
  };

  if (model === 'LINEAR') {
    const { A, B, r } = fitLinearUV(xList, yList);
    return { model, A: Number(A.toPrecision(8)), B: Number(B.toPrecision(8)), r: Number(r.toPrecision(8)) };
  }
  if (model === 'LN') {
    const u = xList.map((x) => { if (x <= 0) throw new Error('Math ERROR'); return Math.log(x); });
    const { A, B, r } = fitLinearUV(u, yList);
    return { model, A: Number(A.toPrecision(8)), B: Number(B.toPrecision(8)), r: Number(r.toPrecision(8)) };
  }
  if (model === 'EXP_E') {
    const v = yList.map((y) => { if (y <= 0) throw new Error('Math ERROR'); return Math.log(y); });
    const { A: lnA, B, r } = fitLinearUV(xList, v);
    return { model, A: Number(Math.exp(lnA).toPrecision(8)), B: Number(B.toPrecision(8)), r: Number(r.toPrecision(8)) };
  }
  if (model === 'EXP_AB') {
    const v = yList.map((y) => { if (y <= 0) throw new Error('Math ERROR'); return Math.log(y); });
    const { A: lnA, B: lnB, r } = fitLinearUV(xList, v);
    return { model, A: Number(Math.exp(lnA).toPrecision(8)), B: Number(Math.exp(lnB).toPrecision(8)), r: Number(r.toPrecision(8)) };
  }
  if (model === 'POWER') {
    const u = xList.map((x) => { if (x <= 0) throw new Error('Math ERROR'); return Math.log(x); });
    const v = yList.map((y) => { if (y <= 0) throw new Error('Math ERROR'); return Math.log(y); });
    const { A: lnA, B, r } = fitLinearUV(u, v);
    return { model, A: Number(Math.exp(lnA).toPrecision(8)), B: Number(B.toPrecision(8)), r: Number(r.toPrecision(8)) };
  }
  if (model === 'INV') {
    const u = xList.map((x) => { if (x === 0) throw new Error('Math ERROR'); return 1 / x; });
    const { A, B, r } = fitLinearUV(u, yList);
    return { model, A: Number(A.toPrecision(8)), B: Number(B.toPrecision(8)), r: Number(r.toPrecision(8)) };
  }
  if (model === 'QUAD') {
    if (n < 3) throw new Error('Math ERROR');
    let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0, sy = 0, sxy = 0, sx2y = 0;
    for (let i = 0; i < n; i++) {
      const x = xList[i], y = yList[i], x2 = x * x;
      sx += x; sx2 += x2; sx3 += x2 * x; sx4 += x2 * x2;
      sy += y; sxy += x * y; sx2y += x2 * y;
    }
    const solved = solveLinear3x3(
      [[n, sx, sx2], [sx, sx2, sx3], [sx2, sx3, sx4]],
      [sy, sxy, sx2y]
    );
    return { model, A: solved.x, B: solved.y, C: solved.z };
  }
  throw new Error('Syntax ERROR');
}

/* ==========================================================================
   3. BASE-N MODE ENGINE (DEC, HEX, BIN, OCT & Bitwise Operations)
   ========================================================================== */
export function evaluateBaseN(inputA, op, inputB, base = 10) {
  const parseInBase = (str) => {
    const clean = String(str ?? '0').trim().toUpperCase();
    const val = parseInt(clean, base);
    if (Number.isNaN(val)) throw new Error('Syntax ERROR');
    return val | 0; // 32-bit signed integer like fx-991ES
  };

  const a = parseInBase(inputA);
  let res = a;

  if (op === 'NOT') {
    res = ~a;
  } else if (op === 'NEG') {
    res = -a;
  } else if (op) {
    const b = parseInBase(inputB);
    if (op === '+') res = (a + b) | 0;
    else if (op === '-') res = (a - b) | 0;
    else if (op === '*') res = Math.imul(a, b);
    else if (op === '/') {
      if (b === 0) throw new Error('Math ERROR');
      res = (a / b) | 0;
    } else if (op === 'AND') res = a & b;
    else if (op === 'OR') res = a | b;
    else if (op === 'XOR') res = a ^ b;
    else if (op === 'XNOR') res = ~(a ^ b);
  }

  const unsigned = res >>> 0;
  return {
    DEC: res.toString(10),
    HEX: unsigned.toString(16).toUpperCase(),
    BIN: unsigned.toString(2),
    OCT: unsigned.toString(8)
  };
}

/* ==========================================================================
   4. EQN MODE ENGINE (Linear 2x2, 3x3 & Quadratic/Cubic Equations)
   ========================================================================== */
export function solveLinear2x2(a1, b1, c1, a2, b2, c2) {
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-12) throw new Error('No Unique Solution');
  const x = (c1 * b2 - c2 * b1) / det;
  const y = (a1 * c2 - a2 * c1) / det;
  return {
    x: Number(x.toPrecision(8)),
    y: Number(y.toPrecision(8))
  };
}

export function solveLinear3x3(matA, vecB) {
  const det3 = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  const D = det3(matA);
  if (Math.abs(D) < 1e-12) throw new Error('No Unique Solution');

  const replaceCol = (colIdx) =>
    matA.map((row, rIdx) => row.map((v, cIdx) => (cIdx === colIdx ? vecB[rIdx] : v)));

  const Dx = det3(replaceCol(0));
  const Dy = det3(replaceCol(1));
  const Dz = det3(replaceCol(2));

  return {
    x: Number((Dx / D).toPrecision(8)),
    y: Number((Dy / D).toPrecision(8)),
    z: Number((Dz / D).toPrecision(8))
  };
}

export function solveQuadratic(a, b, c) {
  if (Math.abs(a) < 1e-14) throw new Error('Math ERROR (a cannot be 0)');
  const disc = b * b - 4 * a * c;
  const vertexX = -b / (2 * a);
  const vertexY = a * vertexX * vertexX + b * vertexX + c;

  if (disc >= 0) {
    const r1 = (-b + Math.sqrt(disc)) / (2 * a);
    const r2 = (-b - Math.sqrt(disc)) / (2 * a);
    return {
      x1: String(Number(r1.toPrecision(8))),
      x2: String(Number(r2.toPrecision(8))),
      vertexX: Number(vertexX.toPrecision(8)),
      vertexY: Number(vertexY.toPrecision(8))
    };
  } else {
    const re = Number((-b / (2 * a)).toPrecision(6));
    const im = Number((Math.sqrt(-disc) / (2 * Math.abs(a))).toPrecision(6));
    return {
      x1: `${re} + ${im}i`,
      x2: `${re} − ${im}i`,
      vertexX: Number(vertexX.toPrecision(8)),
      vertexY: Number(vertexY.toPrecision(8))
    };
  }
}

export function solveCubic(a, b, c, d) {
  if (Math.abs(a) < 1e-14) throw new Error('Math ERROR (a cannot be 0)');
  // Normalize x³ + px² + qx + r = 0
  const A = b / a, B = c / a, C = d / a;
  const p = B - (A * A) / 3;
  const q = (2 * A * A * A) / 27 - (A * B) / 3 + C;
  const disc = (q * q) / 4 + (p * p * p) / 27;
  const shift = -A / 3;

  if (Math.abs(disc) < 1e-12) {
    const u = Math.cbrt(-q / 2);
    return {
      x1: String(Number((2 * u + shift).toPrecision(8))),
      x2: String(Number((-u + shift).toPrecision(8))),
      x3: String(Number((-u + shift).toPrecision(8)))
    };
  } else if (disc > 0) {
    const sqrtD = Math.sqrt(disc);
    const u = Math.cbrt(-q / 2 + sqrtD);
    const v = Math.cbrt(-q / 2 - sqrtD);
    const x1 = u + v + shift;
    const re = Number((-(u + v) / 2 + shift).toPrecision(6));
    const im = Number(((Math.sqrt(3) / 2) * Math.abs(u - v)).toPrecision(6));
    return {
      x1: String(Number(x1.toPrecision(8))),
      x2: `${re} + ${im}i`,
      x3: `${re} − ${im}i`
    };
  } else {
    const r = Math.sqrt(-(p * p * p) / 27);
    const phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r))));
    const m = 2 * Math.cbrt(r);
    const x1 = m * Math.cos(phi / 3) + shift;
    const x2 = m * Math.cos((phi + 2 * Math.PI) / 3) + shift;
    const x3 = m * Math.cos((phi + 4 * Math.PI) / 3) + shift;
    return {
      x1: String(Number(x1.toPrecision(8))),
      x2: String(Number(x2.toPrecision(8))),
      x3: String(Number(x3.toPrecision(8)))
    };
  }
}

/* ==========================================================================
   5. MATRIX MODE ENGINE (Up to 3x3)
   ========================================================================== */
export const MatrixEngine = {
  add(A, B) {
    if (A.length !== B.length || A[0].length !== B[0].length) throw new Error('Dimension ERROR');
    return A.map((row, i) => row.map((v, j) => Number((v + B[i][j]).toPrecision(8))));
  },
  sub(A, B) {
    if (A.length !== B.length || A[0].length !== B[0].length) throw new Error('Dimension ERROR');
    return A.map((row, i) => row.map((v, j) => Number((v - B[i][j]).toPrecision(8))));
  },
  mul(A, B) {
    if (A[0].length !== B.length) throw new Error('Dimension ERROR');
    const rows = A.length, cols = B[0].length, inner = B.length;
    const out = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let sum = 0;
        for (let k = 0; k < inner; k++) sum += A[i][k] * B[k][j];
        out[i][j] = Number(sum.toPrecision(8));
      }
    }
    return out;
  },
  transpose(A) {
    return A[0].map((_, colIdx) => A.map((row) => row[colIdx]));
  },
  det(A) {
    const n = A.length;
    if (n !== A[0].length) throw new Error('Dimension ERROR');
    if (n === 1) return A[0][0];
    if (n === 2) return Number((A[0][0] * A[1][1] - A[0][1] * A[1][0]).toPrecision(8));
    if (n === 3) {
      const d =
        A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
        A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
        A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
      return Number(d.toPrecision(8));
    }
    throw new Error('Dimension ERROR');
  },
  inverse(A) {
    const d = this.det(A);
    if (Math.abs(d) < 1e-12) throw new Error('Math ERROR (Singular Matrix)');
    const n = A.length;
    if (n === 2) {
      return [
        [Number((A[1][1] / d).toPrecision(6)), Number((-A[0][1] / d).toPrecision(6))],
        [Number((-A[1][0] / d).toPrecision(6)), Number((A[0][0] / d).toPrecision(6))]
      ];
    }
    if (n === 3) {
      const adj = Array.from({ length: 3 }, () => Array(3).fill(0));
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const minor = [];
          for (let r = 0; r < 3; r++) {
            if (r === i) continue;
            const row = [];
            for (let c = 0; c < 3; c++) {
              if (c === j) continue;
              row.push(A[r][c]);
            }
            minor.push(row);
          }
          const sign = (i + j) % 2 === 0 ? 1 : -1;
          adj[j][i] = Number(((sign * this.det(minor)) / d).toPrecision(6));
        }
      }
      return adj;
    }
    throw new Error('Dimension ERROR');
  }
};

/* ==========================================================================
   6. VECTOR MODE ENGINE (2D & 3D Vectors)
   ========================================================================== */
export const VectorEngine = {
  dot(u, v) {
    if (u.length !== v.length) throw new Error('Dimension ERROR');
    return u.reduce((acc, val, idx) => acc + val * v[idx], 0);
  },
  cross(u, v) {
    const a = [u[0] || 0, u[1] || 0, u[2] || 0];
    const b = [v[0] || 0, v[1] || 0, v[2] || 0];
    return [
      Number((a[1] * b[2] - a[2] * b[1]).toPrecision(8)),
      Number((a[2] * b[0] - a[0] * b[2]).toPrecision(8)),
      Number((a[0] * b[1] - a[1] * b[0]).toPrecision(8))
    ];
  },
  abs(u) {
    return Number(Math.hypot(...u).toPrecision(8));
  },
  unit(u) {
    const mag = Math.hypot(...u);
    if (mag === 0) throw new Error('Math ERROR');
    return u.map((x) => Number((x / mag).toPrecision(6)));
  },
  angleDeg(u, v) {
    const denom = Math.hypot(...u) * Math.hypot(...v);
    if (denom === 0) throw new Error('Math ERROR');
    const cosTheta = Math.max(-1, Math.min(1, this.dot(u, v) / denom));
    return Number(((Math.acos(cosTheta) * 180) / Math.PI).toPrecision(8));
  }
};

/* ==========================================================================
   7. TABLE MODE ENGINE (f(X) & g(X) Step Table)
   ========================================================================== */
export function generateFunctionTable(fExpr, gExpr, start, end, step, angleUnit = 'DEG') {
  if (step <= 0) throw new Error('Math ERROR');
  const count = Math.floor((end - start) / step) + 1;
  if (count < 1 || count > 45) throw new Error('Range Limit (Max 45 rows)');

  const rows = [];
  for (let i = 0; i < count; i++) {
    const xVal = Number((start + i * step).toPrecision(10));
    const fRes = evaluateCompExpression(fExpr, { angleUnit, variables: { X: xVal } });
    const gRes = gExpr
      ? evaluateCompExpression(gExpr, { angleUnit, variables: { X: xVal } })
      : null;

    rows.push({
      x: xVal,
      fx: fRes.ok ? fRes.decimalText : 'ERROR',
      gx: gRes ? (gRes.ok ? gRes.decimalText : 'ERROR') : '—'
    });
  }
  return rows;
}

/* ==========================================================================
   8. DISTRIBUTION MODE ENGINE (Normal, Binomial, Poisson)
   ========================================================================== */
function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);
  return sign * y;
}

export const DistributionEngine = {
  normalPD(x, mu = 0, sigma = 1) {
    if (sigma <= 0) throw new Error('Math ERROR');
    const z = (x - mu) / sigma;
    return Number((Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI))).toPrecision(8));
  },
  normalCD(lower, upper, mu = 0, sigma = 1) {
    if (sigma <= 0) throw new Error('Math ERROR');
    const cdf = (val) => 0.5 * (1 + erf((val - mu) / (sigma * Math.sqrt(2))));
    return Number((cdf(upper) - cdf(lower)).toPrecision(8));
  },
  inverseNormal(area, mu = 0, sigma = 1) {
    if (area <= 0 || area >= 1 || sigma <= 0) throw new Error('Math ERROR');
    // Beasley-Springer-Moro rational approximation for Φ⁻¹(p)
    let low = -8, high = 8;
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      const p = 0.5 * (1 + erf(mid / Math.sqrt(2)));
      if (p < area) low = mid;
      else high = mid;
    }
    return Number((mu + ((low + high) / 2) * sigma).toPrecision(8));
  },
  binomialPD(x, n, p) {
    if (p < 0 || p > 1 || x < 0 || x > n) throw new Error('Math ERROR');
    return Number((nCr(n, x) * Math.pow(p, x) * Math.pow(1 - p, n - x)).toPrecision(8));
  },
  binomialCD(x, n, p) {
    let sum = 0;
    for (let k = 0; k <= Math.floor(x); k++) sum += this.binomialPD(k, n, p);
    return Number(sum.toPrecision(8));
  },
  poissonPD(x, lambda) {
    if (lambda <= 0 || x < 0) throw new Error('Math ERROR');
    return Number(((Math.pow(lambda, x) * Math.exp(-lambda)) / factorial(x)).toPrecision(8));
  },
  poissonCD(x, lambda) {
    let sum = 0;
    for (let k = 0; k <= Math.floor(x); k++) sum += this.poissonPD(k, lambda);
    return Number(sum.toPrecision(8));
  }
};

/* ==========================================================================
   9. INEQUALITY & 10. RATIO & 11. SPREADSHEET ENGINES
   ========================================================================== */
export function solveQuadraticInequality(a, b, c, rel = '>') {
  if (a === 0) throw new Error('Math ERROR');
  const disc = b * b - 4 * a * c;
  if (disc < 0) {
    const alwaysTrue = (a > 0 && (rel === '>' || rel === '>=')) || (a < 0 && (rel === '<' || rel === '<='));
    return alwaysTrue ? 'All Real Numbers (ℝ)' : 'No Solution (∅)';
  }
  const r1 = Number(((-b - Math.sqrt(disc)) / (2 * a)).toPrecision(6));
  const r2 = Number(((-b + Math.sqrt(disc)) / (2 * a)).toPrecision(6));
  const low = Math.min(r1, r2);
  const high = Math.max(r1, r2);

  const outside = (a > 0 && (rel === '>' || rel === '>=')) || (a < 0 && (rel === '<' || rel === '<='));
  const eq = rel.includes('=') ? '=' : '';
  if (low === high) {
    return outside ? (eq ? 'All Real Numbers (ℝ)' : `x ≠ ${low}`) : (eq ? `x = ${low}` : 'No Solution (∅)');
  }
  return outside ? `x <${eq} ${low}, ${high} <${eq} x` : `${low} <${eq} x <${eq} ${high}`;
}

export function solveRatio(type, v1, v2, v3) {
  // type 'X_RIGHT': a : b = X : d -> X = (a * d) / b
  // type 'X_LEFT' : a : X = c : d -> X = (a * d) / c
  if (v2 === 0) throw new Error('Math ERROR');
  return Number(((v1 * v3) / v2).toPrecision(8));
}