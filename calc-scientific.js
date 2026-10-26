/**
 * ZenvX - Calculator
 * File: js/features/calc-scientific.js
 * Purpose: Premium Scientific Calculator UI & Controller (fx-991ES PLUS / EX equivalent)
 *          with Extra-Large Natural Textbook Display, 3 Eye-Soothing LCD Themes,
 *          SHIFT/ALPHA layers, Replay D-Pad, S<=>D toggle, 40 Constants, 40 Conversions,
 *          and 12 Interactive Mathematical Modes.
 */

import { store } from '../core/state.js';
import { localDB, STORES } from '../core/db-local.js';
import { formatDigits, t } from '../config/i18n.js';
import {
  playKeyFeedback,
  copyToClipboard,
  showSnackbar,
  openModal,
  closeModal,
  renderMathInText
} from '../core/ui-components.js';
import {
  SCIENTIFIC_CONSTANTS,
  UNIT_CONVERSIONS,
  evaluateCompExpression,
  solveEquationForX,
  primeFactorize,
  toDMSString,
  formatEngNotation
} from '../math-engine/evaluator-comp.js';
import {
  ComplexNumber,
  computeOneVarStats,
  computeRegressionStats,
  evaluateBaseN,
  solveLinear2x2,
  solveLinear3x3,
  solveQuadratic,
  solveCubic,
  MatrixEngine,
  VectorEngine,
  generateFunctionTable,
  DistributionEngine,
  solveQuadraticInequality,
  solveRatio
} from '../math-engine/modes-engine.js';

// Calculator Internal State
let sciExpr = '';
let cursorIndex = 0;
let insertMode = true; // true = Insert, false = Overwrite
let shiftActive = false;
let alphaActive = false;
let stoPending = false;
let rclPending = false;

let lastNumericAns = 0;
let preAnsValue = 0;
let lastEvalObject = null;
let showingSymbolic = true; // S<=>D state
let engShiftSteps = 0;
let lcdTheme = 'mint'; // 'mint' | 'amber' | 'oled'

// Replay History Ring Buffer
let replayBuffer = [];
let replayPointer = -1;

// Variable Memory Map (A, B, C, D, E, F, X, Y, M)
const sciVariables = {
  A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, M: 0
};

// 12 Modes Metadata
const SCI_MODES = [
  { id: 'COMP', code: '1', name: 'COMP', desc: 'সাধারণ ও ক্যালকুলাস হিসাব' },
  { id: 'CMPLX', code: '2', name: 'CMPLX', desc: 'জটিল সংখ্যা (a+bi / r∠θ)' },
  { id: 'STAT', code: '3', name: 'STAT', desc: 'পরিসংখ্যান ও রিগ্রেশন' },
  { id: 'BASE_N', code: '4', name: 'BASE-N', desc: 'DEC, HEX, BIN, OCT ও লজিক' },
  { id: 'EQN', code: '5', name: 'EQN', desc: 'সহসমীকরণ ও দ্বিঘাত/ত্রিঘাত' },
  { id: 'MATRIX', code: '6', name: 'MATRIX', desc: 'ম্যাট্রিক্স (৩×৩ পর্যন্ত)' },
  { id: 'TABLE', code: '7', name: 'TABLE', desc: 'ফাংশন টেবিল f(x), g(x)' },
  { id: 'VECTOR', code: '8', name: 'VECTOR', desc: 'ভেক্টর ডট ও ক্রস গুণন' },
  { id: 'DIST', code: '9', name: 'DIST', desc: 'Normal, Binomial, Poisson' },
  { id: 'INEQ', code: '10', name: 'INEQ', desc: 'অসমতা সমাধান (Inequality)' },
  { id: 'RATIO', code: '11', name: 'RATIO', desc: 'অনুপাত ও সমানুপাত (a:b=X:d)' },
  { id: 'SPREADSHEET', code: '12', name: 'SHEET', desc: 'স্প্রেডশিট টেবিল ক্যালকুলেশন' }
];

export async function initScientificCalculator() {
  const container = document.getElementById('subview-sci-calc');
  if (!container) return;

  // Load saved variables & replay history
  const savedVars = await localDB.getById(STORES.SCI_MEMORY, 'vars_v1');
  if (savedVars && savedVars.data) {
    Object.assign(sciVariables, savedVars.data);
  }
  const savedHist = await localDB.getAll(STORES.SCI_HISTORY, 50);
  replayBuffer = savedHist.map((h) => h.expr).reverse();
  replayPointer = replayBuffer.length;

  injectPremiumSciStyles();
  renderScientificLayout(container);
  bindScientificEvents(container);

  store.subscribe(() => {
    updateSciLCD();
  });
}

/**
 * Inject Enhanced Premium Styling for Extra-Large Natural Display & Tactile Keys
 */
function injectPremiumSciStyles() {
  if (document.getElementById('zenvx-sci-premium-css')) return;
  const style = document.createElement('style');
  style.id = 'zenvx-sci-premium-css';
  style.textContent = `
    .sci-chassis-premium {
      background: linear-gradient(165deg, #1E293B 0%, #0F172A 100%);
      border-radius: 26px;
      padding: 18px;
      box-shadow: 0 20px 45px rgba(2, 6, 23, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.12);
      border: 1px solid #334155;
      max-width: 520px;
      margin: 0 auto;
    }
    .sci-brand-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding: 0 4px;
    }
    .sci-brand-title {
      font-family: var(--font-mono);
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.08em;
      color: #E2E8F0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sci-solar-panel {
      width: 78px;
      height: 22px;
      background: linear-gradient(90deg, #27171c 0%, #3b232a 48%, #27171c 52%, #3b232a 100%);
      border-radius: 4px;
      border: 1.5px solid #475569;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
    }
    /* Extra-Large Natural Textbook Display */
    .sci-lcd-xl {
      min-height: 172px;
      border-radius: 16px;
      padding: 12px 16px;
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 4px solid #090D16;
      box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.25), 0 1px 0 rgba(255,255,255,0.08);
      transition: background-color 0.25s ease, color 0.25s ease;
      position: relative;
    }
    .sci-lcd-xl[data-lcd="mint"] {
      background: linear-gradient(180deg, #DCE8D6 0%, #C9DAC2 100%);
      color: #0B1911;
    }
    .sci-lcd-xl[data-lcd="amber"] {
      background: linear-gradient(180deg, #FBF3DC 0%, #F1E3BE 100%);
      color: #231807;
    }
    .sci-lcd-xl[data-lcd="oled"] {
      background: linear-gradient(180deg, #09131C 0%, #050B11 100%);
      color: #38BDF8;
      border-color: #1E293B;
    }
    .sci-expr-xl {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 600;
      min-height: 58px;
      display: flex;
      align-items: center;
      overflow-x: auto;
      white-space: nowrap;
      padding: 6px 2px;
      letter-spacing: 0.02em;
    }
    .sci-result-xl {
      text-align: right;
      font-family: var(--font-mono);
      font-size: 1.75rem;
      font-weight: 800;
      min-height: 62px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      overflow-x: auto;
      padding-top: 4px;
      border-top: 1px dashed rgba(128, 128, 128, 0.25);
    }
    .sci-mode-ribbon {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-bottom: 10px;
      scrollbar-width: none;
    }
    .sci-mode-ribbon::-webkit-scrollbar { display: none; }
    .sci-mode-chip {
      padding: 5px 11px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(255,255,255,0.07);
      color: #CBD5E1;
      white-space: nowrap;
      border: 1px solid rgba(255,255,255,0.1);
      transition: all 0.15s ease;
    }
    .sci-mode-chip.active {
      background: #0EA5E9;
      color: #FFFFFF;
      border-color: #38BDF8;
      box-shadow: 0 2px 10px rgba(14, 165, 233, 0.4);
    }
    .mode-workbench-card {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 12px;
      margin-bottom: 12px;
      color: #F1F5F9;
    }
  `;
  document.head.appendChild(style);
}

function renderScientificLayout(container) {
  const { sciSetup } = store.getState();

  container.innerHTML = `
    <div class="calc-workspace">
      <div class="sci-chassis-premium" id="sci-chassis">

        <!-- Top Brand Header & Solar Accent -->
        <div class="sci-brand-bar">
          <div class="sci-brand-title">
            <span class="material-symbols-rounded" style="color:#38BDF8; font-size:18px;">functions</span>
            <span>ZenvX 991-EX PRO</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button id="btn-sci-lcd-theme" class="sci-mode-chip" title="ডিসপ্লে কালার থিম পরিবর্তন">
              <span class="material-symbols-rounded" style="font-size:13px; vertical-align:middle;">palette</span>
              <span id="lbl-lcd-theme">Mint LCD</span>
            </button>
            <div class="sci-solar-panel" title="Natural Textbook Display"></div>
          </div>
        </div>

        <!-- Quick 12-Mode Selector Ribbon -->
        <div class="sci-mode-ribbon" id="sci-mode-ribbon">
          ${SCI_MODES.map(
            (m) => `
            <button class="sci-mode-chip ${sciSetup.activeMode === m.id ? 'active' : ''}" data-mode-select="${m.id}">
              ${m.code}:${m.name}
            </button>`
          ).join('')}
        </div>

        <!-- Extra-Large Natural Textbook LCD Screen -->
        <div class="sci-lcd-xl" id="sci-lcd-screen" data-lcd="${lcdTheme}" title="ফলাফল কপি করতে ট্যাপ করুন">
          <div class="sci-status-bar">
            <span class="sci-status-pill" id="st-shift">SHIFT</span>
            <span class="sci-status-pill" id="st-alpha">ALPHA</span>
            <span class="sci-status-pill" id="st-sto">STO</span>
            <span class="sci-status-pill on" id="st-mode">${sciSetup.activeMode}</span>
            <span class="sci-status-pill on" id="st-angle">${sciSetup.angleUnit}</span>
            <span class="sci-status-pill on" id="st-math">${sciSetup.displayMode}</span>
            <span class="sci-status-pill ${sciVariables.M !== 0 ? 'on' : ''}" id="st-mem">M</span>
          </div>

          <div class="sci-expr-xl" id="sci-expr-box"></div>
          <div class="sci-result-xl" id="sci-result-box">0</div>
        </div>

        <!-- Dynamic Mode Workbench (Shown when in EQN, MATRIX, STAT, VECTOR, BASE-N, TABLE, DIST, INEQ, RATIO, SHEET) -->
        <div id="sci-mode-workbench" class="mode-workbench-card hidden"></div>

        <!-- Top Control Row: SHIFT, ALPHA, Replay D-Pad, MODE, SETUP -->
        <div class="sci-top-controls">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <div class="sci-key-wrap">
              <div class="sci-sub-labels"><span class="lbl-shift">SHIFT</span></div>
              <button class="sci-key" id="key-sci-shift" style="background:#D97706; color:#FFF;">SHIFT</button>
            </div>
            <div class="sci-key-wrap">
              <div class="sci-sub-labels"><span class="lbl-alpha">ALPHA</span></div>
              <button class="sci-key" id="key-sci-alpha" style="background:#DB2777; color:#FFF;">ALPHA</button>
            </div>
            <div class="sci-key-wrap">
              <div class="sci-sub-labels"><span class="lbl-shift">SOLVE</span><span class="lbl-alpha">=</span></div>
              <button class="sci-key" data-sci-action="CALC">CALC</button>
            </div>
            <div class="sci-key-wrap">
              <div class="sci-sub-labels"><span class="lbl-shift">d/dx</span><span class="lbl-alpha">:</span></div>
              <button class="sci-key" data-sci-action="INTEG">∫dx</button>
            </div>
          </div>

          <!-- Center Replay D-Pad -->
          <div class="sci-dpad">
            <div></div>
            <button class="dpad-btn" data-dpad="UP" title="Previous Expression">▲</button>
            <div></div>
            <button class="dpad-btn" data-dpad="LEFT" title="Cursor Left">◀</button>
            <button class="dpad-btn" data-dpad="DOWN" title="Next Expression">▼</button>
            <button class="dpad-btn" data-dpad="RIGHT" title="Cursor Right">▶</button>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <div class="sci-key-wrap">
              <div class="sci-sub-labels"><span class="lbl-shift">SETUP</span></div>
              <button class="sci-key" data-sci-action="MODE">MODE</button>
            </div>
            <div class="sci-key-wrap">
              <div class="sci-sub-labels"><span class="lbl-shift">CONST</span></div>
              <button class="sci-key" data-sci-action="CONST">CONST</button>
            </div>
            <div class="sci-key-wrap">
              <div class="sci-sub-labels"><span class="lbl-shift">CONV</span></div>
              <button class="sci-key" data-sci-action="CONV">CONV</button>
            </div>
            <div class="sci-key-wrap">
              <div class="sci-sub-labels"><span class="lbl-shift">x!</span></div>
              <button class="sci-key" data-sci-fn="^-1">x⁻¹</button>
            </div>
          </div>
        </div>

        <!-- 6-Column Scientific Function Keypad -->
        <div class="sci-fn-grid">
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">ab/c</span></div>
            <button class="sci-key" data-sci-fn="FRAC">a/b</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">³√</span></div>
            <button class="sci-key" data-sci-fn="SQRT">√■</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">x³</span></div>
            <button class="sci-key" data-sci-fn="SQ">x²</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">ⁿ√</span></div>
            <button class="sci-key" data-sci-fn="POW">xⁿ</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">10ˣ</span></div>
            <button class="sci-key" data-sci-fn="LOG">log</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">eˣ</span></div>
            <button class="sci-key" data-sci-fn="LN">ln</button>
          </div>

          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">∠</span><span class="lbl-alpha">A</span></div>
            <button class="sci-key" data-sci-fn="NEG" data-var="A">(−)</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">FACT</span><span class="lbl-alpha">B</span></div>
            <button class="sci-key" data-sci-fn="DMS" data-var="B">°′″</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">Abs</span><span class="lbl-alpha">C</span></div>
            <button class="sci-key" data-sci-fn="HYP" data-var="C">hyp</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">sin⁻¹</span><span class="lbl-alpha">D</span></div>
            <button class="sci-key" data-sci-fn="SIN" data-var="D">sin</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">cos⁻¹</span><span class="lbl-alpha">E</span></div>
            <button class="sci-key" data-sci-fn="COS" data-var="E">cos</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">tan⁻¹</span><span class="lbl-alpha">F</span></div>
            <button class="sci-key" data-sci-fn="TAN" data-var="F">tan</button>
          </div>

          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">STO</span></div>
            <button class="sci-key" data-sci-action="RCL">RCL</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">i</span></div>
            <button class="sci-key" data-sci-action="ENG">ENG</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">%</span></div>
            <button class="sci-key" data-sci-char="(">(</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">,</span><span class="lbl-alpha">X</span></div>
            <button class="sci-key" data-sci-char=")" data-var="X">)</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">ab/c⇔d/c</span><span class="lbl-alpha">Y</span></div>
            <button class="sci-key" data-sci-action="SD" data-var="Y">S⇔D</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">M−</span><span class="lbl-alpha">M</span></div>
            <button class="sci-key" data-sci-action="M+" data-var="M">M+</button>
          </div>
        </div>

        <!-- 5-Column Main Number & Operator Keypad -->
        <div class="sci-main-grid">
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">Σ(</span></div>
            <button class="sci-key num-key" data-sci-num="7">7</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">logₐb</span></div>
            <button class="sci-key num-key" data-sci-num="8">8</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">÷R</span></div>
            <button class="sci-key num-key" data-sci-num="9">9</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">INS</span></div>
            <button class="sci-key ac-key" data-sci-action="DEL">DEL</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">CLR</span></div>
            <button class="sci-key ac-key" data-sci-action="AC">AC</button>
          </div>

          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">GCD</span></div>
            <button class="sci-key num-key" data-sci-num="4">4</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">LCM</span></div>
            <button class="sci-key num-key" data-sci-num="5">5</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">Pol(</span></div>
            <button class="sci-key num-key" data-sci-num="6">6</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">nPr</span></div>
            <button class="sci-key num-key" data-sci-op="×">×</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">nCr</span></div>
            <button class="sci-key num-key" data-sci-op="÷">÷</button>
          </div>

          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">Rec(</span></div>
            <button class="sci-key num-key" data-sci-num="1">1</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">RanInt</span></div>
            <button class="sci-key num-key" data-sci-num="2">2</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">π</span></div>
            <button class="sci-key num-key" data-sci-num="3">3</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">°</span></div>
            <button class="sci-key num-key" data-sci-op="+">+</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">Rnd</span></div>
            <button class="sci-key num-key" data-sci-op="−">−</button>
          </div>

          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">Ran#</span></div>
            <button class="sci-key num-key" data-sci-num="0">0</button>
          </div>
            <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">e</span></div>
            <button class="sci-key num-key" data-sci-char=".">.</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">π</span></div>
            <button class="sci-key num-key" data-sci-fn="EXP10">×10ˣ</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">PreAns</span></div>
            <button class="sci-key num-key" data-sci-fn="ANS">Ans</button>
          </div>
          <div class="sci-key-wrap">
            <div class="sci-sub-labels"><span class="lbl-shift">≈</span></div>
            <button class="sci-key eq-key" data-sci-action="EQUALS">=</button>
          </div>
        </div>
      </div>

      <!-- Right Column: Memory Registers & Calculation Log -->
      <div class="calc-history-panel">
        <div class="history-header">
          <h3 style="font-size:var(--text-base); font-weight:700;">মেমরি ও ভ্যারিয়েবল (A–F, X, Y, M)</h3>
          <button id="btn-sci-clear-vars" class="btn btn-text" style="min-height:28px; padding:2px 8px; font-size:12px;">Reset</button>
        </div>
        <div id="sci-vars-grid" style="display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:14px;"></div>

        <div class="history-header">
          <h3 style="font-size:var(--text-base); font-weight:700;">সায়েন্টিফিক ইতিহাস</h3>
        </div>
        <div id="sci-history-list" class="history-list"></div>
      </div>
    </div>
  `;

  updateSciLCD();
  renderVariablesPanel();
  renderModeWorkbench(sciSetup.activeMode);
}

/**
 * Insert text at current cursor position respecting Insert/Overwrite mode
 */
function insertAtCursor(text) {
  if (!insertMode && cursorIndex < sciExpr.length) {
    sciExpr = sciExpr.slice(0, cursorIndex) + text + sciExpr.slice(cursorIndex + 1);
  } else {
    sciExpr = sciExpr.slice(0, cursorIndex) + text + sciExpr.slice(cursorIndex);
  }
  cursorIndex += text.length;
  resetModifiers();
  updateSciLCD();
}

function resetModifiers() {
  shiftActive = false;
  alphaActive = false;
  stoPending = false;
  rclPending = false;
}

/**
 * Format expression with KaTeX Natural Display when in MATH IO mode
 */
function updateSciLCD() {
  const { sciSetup, numSystem } = store.getState();

  document.getElementById('st-shift')?.classList.toggle('on', shiftActive);
  document.getElementById('st-alpha')?.classList.toggle('on', alphaActive);
  document.getElementById('st-sto')?.classList.toggle('on', stoPending || rclPending);

  const modeEl = document.getElementById('st-mode');
  if (modeEl) modeEl.textContent = sciSetup.activeMode;

  const angleEl = document.getElementById('st-angle');
  if (angleEl) angleEl.textContent = sciSetup.angleUnit;

  const mathEl = document.getElementById('st-math');
  if (mathEl) mathEl.textContent = sciSetup.displayMode;

  const memEl = document.getElementById('st-mem');
  if (memEl) memEl.classList.toggle('on', sciVariables.M !== 0);

  // Render Expression with cursor
  const exprBox = document.getElementById('sci-expr-box');
  if (exprBox) {
    const leftPart = formatDigits(sciExpr.slice(0, cursorIndex), numSystem);
    const rightPart = formatDigits(sciExpr.slice(cursorIndex), numSystem);
    const cursorSpan = `<span class="sci-cursor ${insertMode ? '' : 'overwrite'}"></span>`;
    exprBox.innerHTML = `${leftPart}${cursorSpan}${rightPart}`;
  }

  // Render Result Box (Natural LaTeX or Decimal)
  const resBox = document.getElementById('sci-result-box');
  if (!resBox) return;

  if (!lastEvalObject) {
    resBox.textContent = formatDigits('0', numSystem);
    return;
  }

  if (!lastEvalObject.ok) {
    resBox.innerHTML = `<span style="color:#DC2626; font-size:1.1rem;">${lastEvalObject.error}</span>`;
    return;
  }

  if (showingSymbolic && sciSetup.displayMode === 'MATH' && window.katex && lastEvalObject.hasSymbolic) {
    try {
      resBox.innerHTML = window.katex.renderToString(lastEvalObject.symbolicLatex, {
        displayMode: false,
        throwOnError: false
      });
      return;
    } catch (_) {
      // Fallback to text
    }
  }

  const outStr = showingSymbolic ? lastEvalObject.symbolicText : lastEvalObject.decimalText;
  resBox.textContent = formatDigits(outStr, numSystem);
}

function renderVariablesPanel() {
  const grid = document.getElementById('sci-vars-grid');
  if (!grid) return;
  const { numSystem } = store.getState();

  grid.innerHTML = Object.entries(sciVariables)
    .map(
      ([k, v]) => `
      <div style="background:var(--bg-surface-variant); padding:6px 8px; border-radius:8px; font-family:var(--font-mono); font-size:12px; display:flex; justify-content:space-between;">
        <strong style="color:var(--color-primary);">${k}=</strong>
        <span>${formatDigits(Number(v.toPrecision(6)), numSystem)}</span>
      </div>`
    )
    .join('');
}

async function saveVariables() {
  await localDB.put(STORES.SCI_MEMORY, { id: 'vars_v1', data: sciVariables });
  renderVariablesPanel();
}

/**
 * Evaluate current Scientific Expression
 */
async function executeScientificEquals() {
  if (!sciExpr.trim()) return;
  const { sciSetup } = store.getState();

  const res = evaluateCompExpression(sciExpr, {
    ...sciSetup,
    variables: sciVariables,
    ans: lastNumericAns,
    preAns: preAnsValue
  });

  lastEvalObject = res;
  showingSymbolic = sciSetup.displayMode === 'MATH';
  engShiftSteps = 0;

  if (res.ok) {
    preAnsValue = lastNumericAns;
    lastNumericAns = res.numeric;
    replayBuffer.push(sciExpr);
    replayPointer = replayBuffer.length;

    await localDB.put(STORES.SCI_HISTORY, {
      expr: sciExpr,
      result: res.symbolicText,
      decimal: res.decimalText
    });
    renderSciHistory();
  }

  updateSciLCD();
}

async function renderSciHistory() {
  const listEl = document.getElementById('sci-history-list');
  if (!listEl) return;
  const items = await localDB.getAll(STORES.SCI_HISTORY, 30);
  const { numSystem } = store.getState();

  if (!items.length) {
    listEl.innerHTML = `<p style="font-size:12px; color:var(--text-muted); text-align:center; padding:16px;">এখনো কোনো হিসাব নেই</p>`;
    return;
  }

  listEl.innerHTML = items
    .map(
      (item) => `
      <div class="history-item" data-sci-reuse="${item.expr}">
        <div class="history-item-content">
          <div class="history-expr">${formatDigits(item.expr, numSystem)}</div>
          <div class="history-res">= ${formatDigits(item.result, numSystem)}</div>
        </div>
      </div>`
    )
    .join('');

  listEl.querySelectorAll('[data-sci-reuse]').forEach((row) => {
    row.addEventListener('click', () => {
      playKeyFeedback();
      sciExpr = row.getAttribute('data-sci-reuse') || '';
      cursorIndex = sciExpr.length;
      updateSciLCD();
    });
  });
}

/**
 * Render Interactive Mode Workbenches for Specialized Modes (CMPLX, STAT, BASE-N, EQN, MATRIX, VECTOR, TABLE, DIST, INEQ, RATIO, SPREADSHEET)
 */
function renderModeWorkbench(modeId) {
  const box = document.getElementById('sci-mode-workbench');
  if (!box) return;

  if (modeId === 'COMP') {
    box.classList.add('hidden');
    return;
  }

  box.classList.remove('hidden');

  if (modeId === 'EQN') {
    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <strong>EQN Solver (সমীকরণ সমাধান)</strong>
        <select id="eqn-type-select" class="input-field" style="width:auto; min-height:32px; padding:2px 8px; font-size:12px;">
          <option value="QUAD">ax² + bx + c = 0 (দ্বিঘাত)</option>
          <option value="CUBIC">ax³ + bx² + cx + d = 0 (ত্রিঘাত)</option>
          <option value="LIN2">a₁x + b₁y = c₁ (২ চলক)</option>
          <option value="LIN3">a₁x + b₁y + c₁z = d₁ (৩ চলক)</option>
        </select>
      </div>
      <div id="eqn-inputs-area" style="display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:8px;">
        <input id="eqn-a" type="number" class="input-field" placeholder="a = 1" value="1" style="min-height:34px;">
        <input id="eqn-b" type="number" class="input-field" placeholder="b = -5" value="-5" style="min-height:34px;">
        <input id="eqn-c" type="number" class="input-field" placeholder="c = 6" value="6" style="min-height:34px;">
        <input id="eqn-d" type="number" class="input-field hidden" placeholder="d = 0" value="0" style="min-height:34px;">
      </div>
      <button id="btn-solve-eqn" class="btn btn-primary" style="width:100%; min-height:36px; font-size:13px;">সমীকরণ সমাধান করুন</button>
    `;

    const sel = box.querySelector('#eqn-type-select');
    const area = box.querySelector('#eqn-inputs-area');
    sel?.addEventListener('change', () => {
      const tVal = sel.value;
      if (tVal === 'QUAD') {
        area.innerHTML = `
          <input id="eqn-a" type="number" class="input-field" placeholder="a" value="1">
          <input id="eqn-b" type="number" class="input-field" placeholder="b" value="-5">
          <input id="eqn-c" type="number" class="input-field" placeholder="c" value="6">`;
      } else if (tVal === 'CUBIC') {
        area.innerHTML = `
          <input id="eqn-a" type="number" class="input-field" placeholder="a" value="1">
          <input id="eqn-b" type="number" class="input-field" placeholder="b" value="-6">
          <input id="eqn-c" type="number" class="input-field" placeholder="c" value="11">
          <input id="eqn-d" type="number" class="input-field" placeholder="d" value="-6">`;
      } else if (tVal === 'LIN2') {
        area.innerHTML = `
          <input id="l2-a1" type="number" class="input-field" placeholder="a₁" value="2">
          <input id="l2-b1" type="number" class="input-field" placeholder="b₁" value="3">
          <input id="l2-c1" type="number" class="input-field" placeholder="c₁" value="8">
          <div></div>
          <input id="l2-a2" type="number" class="input-field" placeholder="a₂" value="5">
          <input id="l2-b2" type="number" class="input-field" placeholder="b₂" value="-1">
          <input id="l2-c2" type="number" class="input-field" placeholder="c₂" value="3">`;
      } else if (tVal === 'LIN3') {
        area.innerHTML = `
          <input id="l3-00" type="number" class="input-field" value="1"><input id="l3-01" type="number" class="input-field" value="1"><input id="l3-02" type="number" class="input-field" value="1"><input id="l3-b0" type="number" class="input-field" value="6">
          <input id="l3-10" type="number" class="input-field" value="0"><input id="l3-11" type="number" class="input-field" value="2"><input id="l3-12" type="number" class="input-field" value="5"><input id="l3-b1" type="number" class="input-field" value="-4">
          <input id="l3-20" type="number" class="input-field" value="2"><input id="l3-21" type="number" class="input-field" value="5"><input id="l3-22" type="number" class="input-field" value="-1"><input id="l3-b2" type="number" class="input-field" value="27">`;
      }
    });

    box.querySelector('#btn-solve-eqn')?.addEventListener('click', () => {
      playKeyFeedback();
      try {
        const tVal = sel.value;
        if (tVal === 'QUAD') {
          const a = Number(document.getElementById('eqn-a').value);
          const b = Number(document.getElementById('eqn-b').value);
          const c = Number(document.getElementById('eqn-c').value);
          const r = solveQuadratic(a, b, c);
          lastEvalObject = { ok: true, symbolicText: `x₁=${r.x1}, x₂=${r.x2}`, decimalText: `Min/Max(${r.vertexX}, ${r.vertexY})` };
        } else if (tVal === 'CUBIC') {
          const a = Number(document.getElementById('eqn-a').value);
          const b = Number(document.getElementById('eqn-b').value);
          const c = Number(document.getElementById('eqn-c').value);
          const d = Number(document.getElementById('eqn-d').value);
          const r = solveCubic(a, b, c, d);
          lastEvalObject = { ok: true, symbolicText: `x₁=${r.x1}, x₂=${r.x2}, x₃=${r.x3}`, decimalText: `x₁=${r.x1}` };
        } else if (tVal === 'LIN2') {
          const r = solveLinear2x2(
            Number(document.getElementById('l2-a1').value),
            Number(document.getElementById('l2-b1').value),
            Number(document.getElementById('l2-c1').value),
            Number(document.getElementById('l2-a2').value),
            Number(document.getElementById('l2-b2').value),
            Number(document.getElementById('l2-c2').value)
          );
          lastEvalObject = { ok: true, symbolicText: `x = ${r.x}, y = ${r.y}`, decimalText: `x=${r.x}, y=${r.y}` };
        } else {
          const getV = (id) => Number(document.getElementById(id).value);
          const r = solveLinear3x3(
            [[getV('l3-00'), getV('l3-01'), getV('l3-02')], [getV('l3-10'), getV('l3-11'), getV('l3-12')], [getV('l3-20'), getV('l3-21'), getV('l3-22')]],
            [getV('l3-b0'), getV('l3-b1'), getV('l3-b2')]
          );
          lastEvalObject = { ok: true, symbolicText: `x=${r.x}, y=${r.y}, z=${r.z}`, decimalText: `x=${r.x}, y=${r.y}, z=${r.z}` };
        }
      } catch (err) {
        lastEvalObject = { ok: false, error: err.message };
      }
      updateSciLCD();
    });
    return;
  }

  if (modeId === 'MATRIX') {
    box.innerHTML = `
      <div style="margin-bottom:6px; font-weight:700; font-size:13px;">Matrix Workbench (2×2 বা 3×3 কমা দিয়ে লিখুন)</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
        <div>
          <label style="font-size:11px;">MatA (যেমন: 1,2; 3,4)</label>
          <input id="mat-a-in" class="input-field" value="1,2; 3,4" style="min-height:34px; font-family:var(--font-mono);">
        </div>
        <div>
          <label style="font-size:11px;">MatB (যেমন: 5,6; 7,8)</label>
          <input id="mat-b-in" class="input-field" value="5,6; 7,8" style="min-height:34px; font-family:var(--font-mono);">
        </div>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:6px;">
        <button class="sci-mode-chip active" data-mat-op="ADD">A + B</button>
        <button class="sci-mode-chip active" data-mat-op="SUB">A − B</button>
        <button class="sci-mode-chip active" data-mat-op="MUL">A × B</button>
        <button class="sci-mode-chip active" data-mat-op="DET">det(A)</button>
        <button class="sci-mode-chip active" data-mat-op="INV">A⁻¹ (Inverse)</button>
        <button class="sci-mode-chip active" data-mat-op="TRN">Trn(A)</button>
      </div>
    `;

    const parseMat = (str) =>
      str.split(';').map((r) => r.trim().split(/[\s,]+/).map(Number));

    box.querySelectorAll('[data-mat-op]').forEach((btn) => {
      btn.addEventListener('click', () => {
        playKeyFeedback();
        try {
          const A = parseMat(document.getElementById('mat-a-in').value);
          const B = parseMat(document.getElementById('mat-b-in').value);
          const op = btn.getAttribute('data-mat-op');
          let out;
          if (op === 'ADD') out = MatrixEngine.add(A, B);
          else if (op === 'SUB') out = MatrixEngine.sub(A, B);
          else if (op === 'MUL') out = MatrixEngine.mul(A, B);
          else if (op === 'DET') out = MatrixEngine.det(A);
          else if (op === 'INV') out = MatrixEngine.inverse(A);
          else if (op === 'TRN') out = MatrixEngine.transpose(A);

          const text = Array.isArray(out)
            ? '[' + out.map((r) => r.join(', ')).join(' ; ') + ']'
            : String(out);
          lastEvalObject = { ok: true, symbolicText: text, decimalText: text };
        } catch (err) {
          lastEvalObject = { ok: false, error: err.message };
        }
        updateSciLCD();
      });
    });
    return;
  }

  if (modeId === 'VECTOR') {
    box.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
        <input id="vec-a-in" class="input-field" value="1, 2, 3" placeholder="VctA (x,y,z)" style="min-height:34px;">
        <input id="vec-b-in" class="input-field" value="4, 5, 6" placeholder="VctB (x,y,z)" style="min-height:34px;">
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:6px;">
        <button class="sci-mode-chip active" data-vec-op="DOT">A · B (Dot)</button>
        <button class="sci-mode-chip active" data-vec-op="CROSS">A × B (Cross)</button>
        <button class="sci-mode-chip active" data-vec-op="ABS">|A| (Mag)</button>
        <button class="sci-mode-chip active" data-vec-op="ANGLE">Angle(A,B)</button>
        <button class="sci-mode-chip active" data-vec-op="UNIT">UnitV(A)</button>
      </div>
    `;
    const parseVec = (s) => s.split(/[\s,]+/).map(Number);
    box.querySelectorAll('[data-vec-op]').forEach((btn) => {
      btn.addEventListener('click', () => {
        playKeyFeedback();
        try {
          const u = parseVec(document.getElementById('vec-a-in').value);
          const v = parseVec(document.getElementById('vec-b-in').value);
          const op = btn.getAttribute('data-vec-op');
          let res;
          if (op === 'DOT') res = VectorEngine.dot(u, v);
          else if (op === 'CROSS') res = `(${VectorEngine.cross(u, v).join(', ')})`;
          else if (op === 'ABS') res = VectorEngine.abs(u);
          else if (op === 'ANGLE') res = `${VectorEngine.angleDeg(u, v)}°`;
          else if (op === 'UNIT') res = `(${VectorEngine.unit(u).join(', ')})`;
          lastEvalObject = { ok: true, symbolicText: String(res), decimalText: String(res) };
        } catch (err) {
          lastEvalObject = { ok: false, error: err.message };
        }
        updateSciLCD();
      });
    });
    return;
  }

  if (modeId === 'STAT') {
    box.innerHTML = `
      <div style="margin-bottom:6px; font-size:12px;">ডেটা X (কমা দিয়ে): <input id="stat-x-in" class="input-field" value="10, 20, 30, 40, 50" style="min-height:32px; margin-top:4px;"></div>
      <div style="margin-bottom:8px; font-size:12px;">ডেটা Y (ঐচ্ছিক - Regression): <input id="stat-y-in" class="input-field" value="15, 28, 42, 55, 70" style="min-height:32px; margin-top:4px;"></div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button id="btn-stat-1var" class="sci-mode-chip active">1-Var Stats (x̄, σ, s, Med)</button>
        <button id="btn-stat-reg" class="sci-mode-chip active">Linear Regression (A+BX, r)</button>
      </div>
    `;
    box.querySelector('#btn-stat-1var')?.addEventListener('click', () => {
      playKeyFeedback();
      try {
        const xArr = document.getElementById('stat-x-in').value.split(/[\s,]+/).filter(Boolean).map(Number);
        const s = computeOneVarStats(xArr);
        lastEvalObject = {
          ok: true,
          symbolicText: `x̄=${s.mean}, σ=${s.sigma}, s=${s.sampleS}, Med=${s.med}`,
          decimalText: `Σx=${s.sumX}, Σx²=${s.sumX2}, n=${s.n}`
        };
      } catch (err) {
        lastEvalObject = { ok: false, error: err.message };
      }
      updateSciLCD();
    });
    box.querySelector('#btn-stat-reg')?.addEventListener('click', () => {
      playKeyFeedback();
      try {
        const xArr = document.getElementById('stat-x-in').value.split(/[\s,]+/).filter(Boolean).map(Number);
        const yArr = document.getElementById('stat-y-in').value.split(/[\s,]+/).filter(Boolean).map(Number);
        const reg = computeRegressionStats(xArr, yArr, 'LINEAR');
        lastEvalObject = {
          ok: true,
          symbolicText: `A=${reg.A}, B=${reg.B}, r=${reg.r}`,
          decimalText: `y = ${reg.A} + ${reg.B}x`
        };
      } catch (err) {
        lastEvalObject = { ok: false, error: err.message };
      }
      updateSciLCD();
    });
    return;
  }

  if (modeId === 'BASE_N') {
    box.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr auto 1fr auto; gap:6px; margin-bottom:8px;">
        <input id="basen-a" class="input-field" value="25" placeholder="A" style="min-height:34px;">
        <select id="basen-op" class="input-field" style="width:auto; min-height:34px;">
          <option value="+">+</option><option value="-">−</option><option value="AND">AND</option>
          <option value="OR">OR</option><option value="XOR">XOR</option><option value="XNOR">XNOR</option><option value="NOT">NOT(A)</option>
        </select>
        <input id="basen-b" class="input-field" value="10" placeholder="B" style="min-height:34px;">
        <select id="basen-base" class="input-field" style="width:auto; min-height:34px;">
          <option value="10">DEC</option><option value="16">HEX</option><option value="2">BIN</option><option value="8">OCT</option>
        </select>
      </div>
      <button id="btn-basen-eval" class="btn btn-primary" style="width:100%; min-height:34px; font-size:12px;">রূপান্তর ও লজিক হিসাব করুন</button>
    `;
    box.querySelector('#btn-basen-eval')?.addEventListener('click', () => {
      playKeyFeedback();
      try {
        const res = evaluateBaseN(
          document.getElementById('basen-a').value,
          document.getElementById('basen-op').value,
          document.getElementById('basen-b').value,
          Number(document.getElementById('basen-base').value)
        );
        lastEvalObject = {
          ok: true,
          symbolicText: `DEC:${res.DEC} | HEX:${res.HEX}`,
          decimalText: `BIN:${res.BIN} | OCT:${res.OCT}`
        };
      } catch (err) {
        lastEvalObject = { ok: false, error: err.message };
      }
      updateSciLCD();
    });
    return;
  }

  if (modeId === 'CMPLX') {
    box.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:6px; margin-bottom:8px;">
        <input id="cmplx-1" class="input-field" value="3, 4" placeholder="z₁ (re, im)" style="min-height:34px;">
        <select id="cmplx-op" class="input-field" style="width:auto; min-height:34px;">
          <option value="ADD">+</option><option value="SUB">−</option><option value="MUL">×</option>
          <option value="DIV">÷</option><option value="POL">r∠θ (z₁)</option><option value="CONJ">Conjg(z₁)</option>
        </select>
        <input id="cmplx-2" class="input-field" value="1, -2" placeholder="z₂ (re, im)" style="min-height:34px;">
      </div>
      <button id="btn-cmplx-eval" class="btn btn-primary" style="width:100%; min-height:34px; font-size:12px;">জটিল সংখ্যা হিসাব করুন</button>
    `;
    box.querySelector('#btn-cmplx-eval')?.addEventListener('click', () => {
      playKeyFeedback();
      try {
        const [r1, i1] = document.getElementById('cmplx-1').value.split(',').map(Number);
        const [r2, i2] = document.getElementById('cmplx-2').value.split(',').map(Number);
        const z1 = new ComplexNumber(r1, i1);
        const z2 = new ComplexNumber(r2, i2);
        const op = document.getElementById('cmplx-op').value;
        let out = z1;
        if (op === 'ADD') out = z1.add(z2);
        else if (op === 'SUB') out = z1.sub(z2);
        else if (op === 'MUL') out = z1.mul(z2);
        else if (op === 'DIV') out = z1.div(z2);
        else if (op === 'CONJ') out = z1.conj();

        lastEvalObject = {
          ok: true,
          symbolicText: op === 'POL' ? z1.toPolarString() : out.toRectangularString(),
          decimalText: out.toPolarString()
        };
      } catch (err) {
        lastEvalObject = { ok: false, error: err.message };
      }
      updateSciLCD();
    });
    return;
  }

  if (modeId === 'TABLE') {
    box.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
        <input id="tbl-fx" class="input-field" value="X^2 + 2X" placeholder="f(X) =">
        <input id="tbl-gx" class="input-field" value="2X + 1" placeholder="g(X) =">
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:6px;">
        <input id="tbl-start" type="number" class="input-field" value="1" placeholder="Start">
        <input id="tbl-end" type="number" class="input-field" value="5" placeholder="End">
        <input id="tbl-step" type="number" class="input-field" value="1" placeholder="Step">
        <button id="btn-tbl-gen" class="btn btn-primary" style="min-height:36px;">Table</button>
      </div>
    `;
    box.querySelector('#btn-tbl-gen')?.addEventListener('click', () => {
      playKeyFeedback();
      try {
        const rows = generateFunctionTable(
          document.getElementById('tbl-fx').value,
          document.getElementById('tbl-gx').value,
          Number(document.getElementById('tbl-start').value),
          Number(document.getElementById('tbl-end').value),
          Number(document.getElementById('tbl-step').value)
        );
        const tableHtml = `
          <table style="width:100%; border-collapse:collapse; font-family:var(--font-mono); font-size:13px;">
            <thead><tr style="border-bottom:2px solid var(--border-color);"><th style="padding:6px;">X</th><th>f(X)</th><th>g(X)</th></tr></thead>
            <tbody>${rows.map((r) => `<tr style="border-bottom:1px solid var(--divider-color); text-align:center;"><td style="padding:5px;">${r.x}</td><td>${r.fx}</td><td>${r.gx}</td></tr>`).join('')}</tbody>
          </table>`;
        openModal({ title: 'Function Table f(X) & g(X)', bodyHtml: tableHtml, actions: [{ label: 'বন্ধ করুন' }] });
      } catch (err) {
        showSnackbar(err.message, 'error');
      }
    });
    return;
  }

  // Remaining Modes: DIST, INEQ, RATIO, SPREADSHEET
  box.innerHTML = `
    <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
      <span style="font-size:12px; font-weight:700;">${modeId} Quick Solver:</span>
      <input id="generic-p1" type="number" class="input-field" value="2" style="width:70px; min-height:32px;" title="Param 1">
      <input id="generic-p2" type="number" class="input-field" value="-5" style="width:70px; min-height:32px;" title="Param 2">
      <input id="generic-p3" type="number" class="input-field" value="2" style="width:70px; min-height:32px;" title="Param 3">
      <button id="btn-generic-mode-run" class="sci-mode-chip active">হিসাব করুন</button>
    </div>
  `;
  box.querySelector('#btn-generic-mode-run')?.addEventListener('click', () => {
    playKeyFeedback();
    const v1 = Number(document.getElementById('generic-p1').value);
    const v2 = Number(document.getElementById('generic-p2').value);
    const v3 = Number(document.getElementById('generic-p3').value);
    try {
      let out = '';
      if (modeId === 'INEQ') out = solveQuadraticInequality(v1, v2, v3, '>');
      else if (modeId === 'RATIO') out = `X = ${solveRatio('X_RIGHT', v1, v2, v3)}`;
      else if (modeId === 'DIST') out = `Normal PD = ${DistributionEngine.normalPD(v1, v2, Math.abs(v3) || 1)}`;
      else out = `Sum=${v1 + v2 + v3}, Mean=${Number(((v1 + v2 + v3) / 3).toPrecision(6))}`;
      lastEvalObject = { ok: true, symbolicText: out, decimalText: out };
      updateSciLCD();
    } catch (err) {
      lastEvalObject = { ok: false, error: err.message };
      updateSciLCD();
    }
  });
}

/**
 * Bind all Scientific Keypad & Modal Events
 */
function bindScientificEvents(container) {
  // LCD Theme Switcher (Mint -> Amber -> OLED)
  document.getElementById('btn-sci-lcd-theme')?.addEventListener('click', () => {
    playKeyFeedback();
    const order = ['mint', 'amber', 'oled'];
    const labels = { mint: 'Mint LCD', amber: 'Warm Amber', oled: 'Cyber OLED' };
    lcdTheme = order[(order.indexOf(lcdTheme) + 1) % order.length];
    document.getElementById('sci-lcd-screen')?.setAttribute('data-lcd', lcdTheme);
    const lbl = document.getElementById('lbl-lcd-theme');
    if (lbl) lbl.textContent = labels[lcdTheme];
  });

  // Mode Ribbon Clicks
  container.querySelectorAll('[data-mode-select]').forEach((chip) => {
    chip.addEventListener('click', () => {
      playKeyFeedback();
      const m = chip.getAttribute('data-mode-select');
      store.setSciSetup({ activeMode: m });
      container.querySelectorAll('[data-mode-select]').forEach((c) => c.classList.toggle('active', c === chip));
      renderModeWorkbench(m);
      updateSciLCD();
    });
  });

  // SHIFT & ALPHA Toggles
  document.getElementById('key-sci-shift')?.addEventListener('click', () => {
    playKeyFeedback();
    shiftActive = !shiftActive;
    if (shiftActive) alphaActive = false;
    updateSciLCD();
  });

  document.getElementById('key-sci-alpha')?.addEventListener('click', () => {
    playKeyFeedback();
    alphaActive = !alphaActive;
    if (alphaActive) shiftActive = false;
    updateSciLCD();
  });

  // Replay D-Pad
  container.querySelectorAll('[data-dpad]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      const dir = btn.getAttribute('data-dpad');
      if (dir === 'LEFT') cursorIndex = Math.max(0, cursorIndex - 1);
      else if (dir === 'RIGHT') cursorIndex = Math.min(sciExpr.length, cursorIndex + 1);
      else if (dir === 'UP' && replayBuffer.length > 0) {
        replayPointer = Math.max(0, replayPointer - 1);
        sciExpr = replayBuffer[replayPointer] || '';
        cursorIndex = sciExpr.length;
      } else if (dir === 'DOWN' && replayBuffer.length > 0) {
        replayPointer = Math.min(replayBuffer.length - 1, replayPointer + 1);
        sciExpr = replayBuffer[replayPointer] || '';
        cursorIndex = sciExpr.length;
      }
      updateSciLCD();
    });
  });

  // Variable STO / RCL handling on keys with [data-var]
  const handleVariableKeyIfNeeded = (varName) => {
    if (!varName) return false;
    if (stoPending) {
      sciVariables[varName] = lastNumericAns;
      saveVariables();
      resetModifiers();
      showSnackbar(`${varName} = ${lastNumericAns} সেভ করা হয়েছে`, 'success');
      updateSciLCD();
      return true;
    }
    if (rclPending || alphaActive) {
      insertAtCursor(varName);
      return true;
    }
    return false;
  };

  // Number Keys (0-9) & SHIFT secondary functions
  container.querySelectorAll('[data-sci-num]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      const num = btn.getAttribute('data-sci-num');
      if (shiftActive) {
        const shiftMap = {
          '7': 'Σ(', '8': 'logₐ(', '9': '÷R',
          '4': 'GCD(', '5': 'LCM(', '6': 'Pol(',
          '1': 'Rec(', '2': 'RanInt(', '3': 'π', '0': 'Ran#'
        };
        insertAtCursor(shiftMap[num] || num);
        return;
      }
      insertAtCursor(num);
    });
  });

  // Operators (+, -, ×, ÷) & SHIFT secondary functions
  container.querySelectorAll('[data-sci-op]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      const op = btn.getAttribute('data-sci-op');
      if (shiftActive) {
        if (op === '×') return insertAtCursor('P');
        if (op === '÷') return insertAtCursor('C');
        if (op === '+') return insertAtCursor('°');
        if (op === '−') return insertAtCursor('Rnd(');
      }
      insertAtCursor(op);
    });
  });

  // Character keys: '(', ')', '.'
  container.querySelectorAll('[data-sci-char]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      const varName = btn.getAttribute('data-var');
      if (handleVariableKeyIfNeeded(varName)) return;

      const ch = btn.getAttribute('data-sci-char');
      if (shiftActive) {
        if (ch === '(') return insertAtCursor('%');
        if (ch === ')') return insertAtCursor(',');
        if (ch === '.') return insertAtCursor('e');
      }
      insertAtCursor(ch);
    });
  });

  // Scientific Function Keys
  container.querySelectorAll('[data-sci-fn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      const varName = btn.getAttribute('data-var');
      if (handleVariableKeyIfNeeded(varName)) return;

      const fn = btn.getAttribute('data-sci-fn');
      if (fn === '^-1') return insertAtCursor(shiftActive ? '!' : '⁻¹');
      if (fn === 'FRAC') return insertAtCursor('/');
      if (fn === 'SQRT') return insertAtCursor(shiftActive ? '³√(' : '√(');
      if (fn === 'SQ') return insertAtCursor(shiftActive ? '³' : '²');
      if (fn === 'POW') return insertAtCursor(shiftActive ? 'ⁿ√(' : '^(');
      if (fn === 'LOG') return insertAtCursor(shiftActive ? '10^(' : 'log(');
      if (fn === 'LN') return insertAtCursor(shiftActive ? 'e^(' : 'ln(');
      if (fn === 'NEG') return insertAtCursor(shiftActive ? '∠' : '-');
      if (fn === 'DMS') {
        if (shiftActive && lastEvalObject?.ok) {
          try {
            const f = primeFactorize(lastNumericAns);
            lastEvalObject.symbolicText = f.text;
            lastEvalObject.symbolicLatex = f.latex;
            lastEvalObject.hasSymbolic = true;
            showingSymbolic = true;
            resetModifiers();
            updateSciLCD();
          } catch (e) {
            showSnackbar(e.message, 'error');
          }
          return;
        }
        if (lastEvalObject?.ok && !sciExpr) {
          lastEvalObject.symbolicText = toDMSString(lastNumericAns);
          showingSymbolic = true;
          updateSciLCD();
          return;
        }
        return insertAtCursor('°');
      }
      if (fn === 'HYP') return insertAtCursor(shiftActive ? 'abs(' : 'sinh(');
      if (fn === 'SIN') return insertAtCursor(shiftActive ? 'sin⁻¹(' : 'sin(');
      if (fn === 'COS') return insertAtCursor(shiftActive ? 'cos⁻¹(' : 'cos(');
      if (fn === 'TAN') return insertAtCursor(shiftActive ? 'tan⁻¹(' : 'tan(');
      if (fn === 'EXP10') return insertAtCursor(shiftActive ? 'π' : '×10^');
      if (fn === 'ANS') return insertAtCursor(shiftActive ? 'PreAns' : 'Ans');
    });
  });

  // Action Keys (AC, DEL, EQUALS, S<=>D, ENG, RCL/STO, M+, CONST, CONV, MODE/SETUP, CALC/SOLVE, INTEG)
  container.querySelectorAll('[data-sci-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      const varName = btn.getAttribute('data-var');
      if (handleVariableKeyIfNeeded(varName)) return;

      const act = btn.getAttribute('data-sci-action');

      if (act === 'AC') {
        if (shiftActive) {
          Object.keys(sciVariables).forEach((k) => (sciVariables[k] = 0));
          saveVariables();
          showSnackbar('All Memory Cleared', 'info');
        }
        sciExpr = '';
        cursorIndex = 0;
        lastEvalObject = null;
        resetModifiers();
        updateSciLCD();
        return;
      }

      if (act === 'DEL') {
        if (shiftActive) {
          insertMode = !insertMode;
          resetModifiers();
          updateSciLCD();
          return;
        }
        if (cursorIndex > 0) {
          sciExpr = sciExpr.slice(0, cursorIndex - 1) + sciExpr.slice(cursorIndex);
          cursorIndex--;
        }
        updateSciLCD();
        return;
      }

      if (act === 'EQUALS') {
        executeScientificEquals();
        return;
      }

      if (act === 'SD') {
        if (shiftActive) {
          const nextFrac = store.getState().sciSetup.fractionFormat === 'IMPROPER' ? 'MIXED' : 'IMPROPER';
          store.setSciSetup({ fractionFormat: nextFrac });
          executeScientificEquals();
          return;
        }
        showingSymbolic = !showingSymbolic;
        updateSciLCD();
        return;
      }

      if (act === 'ENG') {
        if (shiftActive) return insertAtCursor('i');
        if (lastEvalObject?.ok) {
          lastEvalObject.symbolicText = formatEngNotation(lastNumericAns, engShiftSteps++);
          showingSymbolic = true;
          updateSciLCD();
        }
        return;
      }

      if (act === 'RCL') {
        if (shiftActive) {
          stoPending = true;
          shiftActive = false;
        } else {
          rclPending = true;
        }
        updateSciLCD();
        return;
      }

      if (act === 'M+') {
        if (!sciExpr && lastEvalObject?.ok) {
          sciVariables.M += shiftActive ? -lastNumericAns : lastNumericAns;
        } else {
          const ev = evaluateCompExpression(sciExpr || '0', { ...store.getState().sciSetup, variables: sciVariables, ans: lastNumericAns });
          if (ev.ok) {
            sciVariables.M += shiftActive ? -ev.numeric : ev.numeric;
          }
        }
        saveVariables();
        resetModifiers();
        updateSciLCD();
        return;
      }

      if (act === 'INTEG') {
        return insertAtCursor(shiftActive ? 'd/dx(' : '∫(');
      }

      if (act === 'CALC') {
        if (alphaActive) return insertAtCursor('=');
        if (shiftActive) {
          resetModifiers();
          const res = solveEquationForX(sciExpr, sciVariables.X || 1, store.getState().sciSetup);
          if (res.ok) {
            sciVariables.X = res.root;
            saveVariables();
            lastEvalObject = { ok: true, symbolicText: `X = ${res.root}`, decimalText: `L−R = ${res.residual}` };
          } else {
            lastEvalObject = { ok: false, error: res.error };
          }
          updateSciLCD();
          return;
        }
        // Standard CALC: prompt for X value
        openModal({
          title: 'CALC — চলক X-এর মান দিন',
          bodyHtml: `<input id="modal-calc-x" type="number" class="input-field" value="${sciVariables.X || 1}">`,
          actions: [
            {
              label: 'মান বসিয়ে হিসাব করুন',
              onClick: () => {
                sciVariables.X = Number(document.getElementById('modal-calc-x').value || 0);
                saveVariables();
                executeScientificEquals();
              }
            }
          ]
        });
        return;
      }

      if (act === 'CONST') {
        openConstantsModal();
        return;
      }

      if (act === 'CONV') {
        openConversionsModal();
        return;
      }

      if (act === 'MODE') {
        if (shiftActive) {
          resetModifiers();
          openSetupModal();
        } else {
          openModePickerModal();
        }
      }
    });
  });

  // Tap LCD to Copy Result
  document.getElementById('sci-lcd-screen')?.addEventListener('click', () => {
    if (lastEvalObject?.ok) {
      copyToClipboard(showingSymbolic ? lastEvalObject.symbolicText : lastEvalObject.decimalText);
    }
  });

  // Reset Variables button
  document.getElementById('btn-sci-clear-vars')?.addEventListener('click', () => {
    playKeyFeedback();
    Object.keys(sciVariables).forEach((k) => (sciVariables[k] = 0));
    saveVariables();
    updateSciLCD();
  });
}

function openConstantsModal() {
  const listHtml = SCIENTIFIC_CONSTANTS.map(
    (c) => `
    <button class="history-item" data-const-val="${c.value}" style="width:100%; text-align:left; margin-bottom:6px;">
      <div><strong>${c.id}: ${c.symbol}</strong> — <span style="font-size:12px;">${c.name}</span></div>
      <code style="font-size:11px; color:var(--color-primary);">${c.value} ${c.unit}</code>
    </button>`
  ).join('');

  openModal({
    title: '৪০টি বৈজ্ঞানিক ধ্রুবক (CONST 01–40)',
    bodyHtml: `<div style="max-height:360px; overflow-y:auto;">${listHtml}</div>`,
    actions: [{ label: 'বন্ধ করুন' }]
  });

  document.querySelectorAll('[data-const-val]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      insertAtCursor(btn.getAttribute('data-const-val'));
      closeModal();
    });
  });
}

function openConversionsModal() {
  const listHtml = UNIT_CONVERSIONS.map(
    (u) => `
    <button class="history-item" data-conv-id="${u.id}" style="width:100%; justify-content:space-between; margin-bottom:6px;">
      <strong>${u.id}: ${u.label}</strong>
      <span class="material-symbols-rounded" style="font-size:18px;">arrow_forward</span>
    </button>`
  ).join('');

  openModal({
    title: '৪০টি একক রূপান্তর (CONV 01–40)',
    bodyHtml: `<div style="max-height:360px; overflow-y:auto;">${listHtml}</div>`,
    actions: [{ label: 'বন্ধ করুন' }]
  });

  document.querySelectorAll('[data-conv-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      const id = btn.getAttribute('data-conv-id');
      const conv = UNIT_CONVERSIONS.find((x) => x.id === id);
      if (!conv) return;
      const ev = evaluateCompExpression(sciExpr || String(lastNumericAns || 1), {
        ...store.getState().sciSetup,
        variables: sciVariables
      });
      const inputVal = ev.ok ? ev.numeric : 1;
      const outVal = conv.fn ? conv.fn(inputVal) : inputVal * conv.factor;
      lastNumericAns = outVal;
      lastEvalObject = {
        ok: true,
        numeric: outVal,
        symbolicText: `${inputVal} (${conv.label}) = ${Number(outVal.toPrecision(8))}`,
        decimalText: String(Number(outVal.toPrecision(8)))
      };
      updateSciLCD();
      closeModal();
    });
  });
}

function openSetupModal() {
  const { sciSetup } = store.getState();
  openModal({
    title: 'SETUP — ক্যালকুলেটর কনফিগারেশন',
    bodyHtml: `
      <div style="display:grid; gap:10px;">
        <div>
          <label class="input-label">কোণের একক (Angle Unit)</label>
          <select id="setup-angle" class="input-field">
            <option value="DEG" ${sciSetup.angleUnit === 'DEG' ? 'selected' : ''}>1: Degree (DEG)</option>
            <option value="RAD" ${sciSetup.angleUnit === 'RAD' ? 'selected' : ''}>2: Radian (RAD)</option>
            <option value="GRA" ${sciSetup.angleUnit === 'GRA' ? 'selected' : ''}>3: Gradian (GRA)</option>
          </select>
        </div>
        <div>
          <label class="input-label">ডিসপ্লে ফরম্যাট (Display Mode)</label>
          <select id="setup-disp" class="input-field">
            <option value="MATH" ${sciSetup.displayMode === 'MATH' ? 'selected' : ''}>1: MathIO (Natural Display)</option>
            <option value="LINE" ${sciSetup.displayMode === 'LINE' ? 'selected' : ''}>2: LineIO (Classic)</option>
          </select>
        </div>
        <div>
          <label class="input-label">সংখ্যা ফরম্যাট (Fix / Sci / Norm)</label>
          <select id="setup-numfmt" class="input-field">
            <option value="NORM1" ${sciSetup.numberFormat === 'NORM1' ? 'selected' : ''}>Norm 1</option>
            <option value="NORM2" ${sciSetup.numberFormat === 'NORM2' ? 'selected' : ''}>Norm 2</option>
            <option value="FIX" ${sciSetup.numberFormat === 'FIX' ? 'selected' : ''}>Fix (দশমিক ঘর নির্দিষ্ট)</option>
            <option value="SCI" ${sciSetup.numberFormat === 'SCI' ? 'selected' : ''}>Sci (বৈজ্ঞানিক সংকেত)</option>
          </select>
        </div>
      </div>
    `,
    actions: [
      {
        label: 'সংরক্ষণ করুন',
        onClick: () => {
          store.setSciSetup({
            angleUnit: document.getElementById('setup-angle').value,
            displayMode: document.getElementById('setup-disp').value,
            numberFormat: document.getElementById('setup-numfmt').value
          });
          updateSciLCD();
        }
      }
    ]
  });
}

function openModePickerModal() {
  const html = SCI_MODES.map(
    (m) => `
    <button class="history-item" data-pick-mode="${m.id}" style="width:100%; justify-content:space-between; margin-bottom:6px;">
      <div><strong>${m.code}: ${m.name}</strong> — <span style="font-size:12px;">${m.desc}</span></div>
    </button>`
  ).join('');

  openModal({
    title: 'MODE নির্বাচন করুন (1–12)',
    bodyHtml: `<div>${html}</div>`,
    actions: [{ label: 'বন্ধ করুন' }]
  });

  document.querySelectorAll('[data-pick-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      const m = btn.getAttribute('data-pick-mode');
      store.setSciSetup({ activeMode: m });
      document.querySelectorAll('[data-mode-select]').forEach((c) =>
        c.classList.toggle('active', c.getAttribute('data-mode-select') === m)
      );
      renderModeWorkbench(m);
      updateSciLCD();
      closeModal();
    });
  });
}