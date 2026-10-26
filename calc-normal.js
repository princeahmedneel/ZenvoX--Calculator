/**
 * ZenvX - Calculator
 * File: js/features/calc-normal.js
 * Purpose: Complete Normal Calculator UI & Controller with live preview,
 *          exact decimal arithmetic, Lakh-Crore / International formatting,
 *          Bangla/English numerals, Memory (M+, M-, MR, MC), IndexedDB history,
 *          long-press copy, share, hardware keyboard support, and unit test viewer.
 */

import { store } from '../core/state.js';
import { localDB, STORES } from '../core/db-local.js';
import {
  t,
  formatDigits,
  formatNumberWithGrouping,
  toEnglishDigits
} from '../config/i18n.js';
import {
  playKeyFeedback,
  copyToClipboard,
  shareContent,
  showSnackbar,
  openModal,
  renderEmptyState
} from '../core/ui-components.js';
import {
  ExactDecimal,
  evaluateNormalExpression,
  runNormalCalculatorUnitTests
} from '../math-engine/decimal-exact.js';

let currentExpr = '';
let currentPreview = '0';
let memoryValue = new ExactDecimal(0n);
let historyItems = [];
let longPressTimer = null;

export async function initNormalCalculator() {
  const container = document.getElementById('subview-normal-calc');
  if (!container) return;

  historyItems = await localDB.getAll(STORES.NORMAL_HISTORY, 100);
  renderNormalCalculatorLayout(container);
  bindNormalCalculatorEvents(container);
  bindHardwareKeyboard();

  // Re-render digits and labels automatically when language, numeral, or grouping changes
  store.subscribe(() => {
    updateDisplayUI();
    renderHistoryList();
    updateToolbarLabels();
  });
}

function renderNormalCalculatorLayout(container) {
  const { lang } = store.getState();

  container.innerHTML = `
    <div class="calc-workspace">
      <!-- Left/Main Column: Calculator Chassis -->
      <div class="calc-chassis" id="normal-calc-chassis">
        <!-- Toolbar: Grouping Toggle, Sound, Vibrate, Unit Test Check -->
        <div class="calc-toolbar">
          <div class="calc-toolbar-group">
            <button id="btn-norm-grouping" class="calc-tool-btn" title="Number Grouping">
              <span class="material-symbols-rounded" style="font-size:16px;">tag</span>
              <span id="lbl-norm-grouping">লাখ-কোটি</span>
            </button>
            <button id="btn-norm-sound" class="calc-tool-btn" title="Key Sound">
              <span class="material-symbols-rounded" id="icon-norm-sound" style="font-size:16px;">volume_up</span>
            </button>
            <button id="btn-norm-vibrate" class="calc-tool-btn" title="Vibration">
              <span class="material-symbols-rounded" id="icon-norm-vibrate" style="font-size:16px;">vibration</span>
            </button>
          </div>
          <div class="calc-toolbar-group">
            <button id="btn-norm-share" class="calc-tool-btn" title="${t('share', lang)}">
              <span class="material-symbols-rounded" style="font-size:16px;">share</span>
            </button>
            <button id="btn-norm-tests" class="calc-tool-btn" title="Run Engine Tests">
              <span class="material-symbols-rounded" style="font-size:16px;">verified</span>
              <span>Test</span>
            </button>
          </div>
        </div>

        <!-- Display Box -->
        <div class="calc-display-box" id="norm-display-box" title="Long-press or click result to copy">
          <div class="calc-indicators">
            <span id="norm-mem-indicator" class="memory-badge hidden">M</span>
            <span id="norm-live-badge" style="margin-left:auto; opacity:0.75;">ZenvX Exact Decimal</span>
          </div>
          <div id="norm-expr-display" class="calc-expr-line" aria-label="Expression">০</div>
          <div id="norm-preview-display" class="calc-preview-line" aria-live="polite">= ০</div>
        </div>

        <!-- Memory Row -->
        <div class="calc-memory-row">
          <button class="mem-key" data-mem="MC">MC</button>
          <button class="mem-key" data-mem="MR">MR</button>
          <button class="mem-key" data-mem="M+">M+</button>
          <button class="mem-key" data-mem="M-">M−</button>
          <button class="mem-key" data-key="±">±</button>
        </div>

        <!-- Main 4x5 Keypad -->
        <div class="calc-keypad-normal" id="norm-keypad">
          <button class="calc-key key-ac" data-key="AC">AC</button>
          <button class="calc-key key-del" data-key="BACKSPACE" aria-label="Backspace">⌫</button>
          <button class="calc-key key-op" data-key="()">( )</button>
          <button class="calc-key key-op" data-key="÷">÷</button>

          <button class="calc-key" data-num="7">৭</button>
          <button class="calc-key" data-num="8">৮</button>
          <button class="calc-key" data-num="9">৯</button>
          <button class="calc-key key-op" data-key="×">×</button>

          <button class="calc-key" data-num="4">৪</button>
          <button class="calc-key" data-num="5">৫</button>
          <button class="calc-key" data-num="6">৬</button>
          <button class="calc-key key-op" data-key="−">−</button>

          <button class="calc-key" data-num="1">১</button>
          <button class="calc-key" data-num="2">২</button>
          <button class="calc-key" data-num="3">৩</button>
          <button class="calc-key key-op" data-key="+">+</button>

          <button class="calc-key" data-num="00">০০</button>
          <button class="calc-key" data-num="0">০</button>
          <button class="calc-key" data-key=".">.</button>
          <button class="calc-key key-op" data-key="%">%</button>

          <button class="calc-key key-eq" data-key="=" style="grid-column: span 4; height: 52px; margin-top: 4px;">=</button>
        </div>
      </div>

      <!-- Right/Bottom Column: History Panel -->
      <div class="calc-history-panel">
        <div class="history-header">
          <h3 id="norm-history-title" style="font-size: var(--text-base); font-weight:700;">
            ${t('calc_history', lang)}
          </h3>
          <button id="btn-norm-clear-history" class="btn btn-text" style="min-height:32px; padding:4px 8px; font-size:var(--text-xs);">
            <span class="material-symbols-rounded" style="font-size:16px;">delete_sweep</span>
            <span data-i18n="clear_all">${t('clear_all', lang)}</span>
          </button>
        </div>
        <div id="norm-history-list" class="history-list"></div>
      </div>
    </div>
  `;

  updateToolbarLabels();
  updateDisplayUI();
  renderHistoryList();
}

function updateToolbarLabels() {
  const { lang, numSystem, numberGrouping, soundEnabled, vibrationEnabled } = store.getState();

  // Update keypad digit labels (০-৯ vs 0-9)
  document.querySelectorAll('#norm-keypad [data-num]').forEach((btn) => {
    const rawNum = btn.getAttribute('data-num');
    btn.textContent = formatDigits(rawNum, numSystem);
  });

  const grpLbl = document.getElementById('lbl-norm-grouping');
  if (grpLbl) {
    grpLbl.textContent = numberGrouping === 'lakh' ? t('calc_grouping_lakh', lang) : t('calc_grouping_intl', lang);
  }

  const soundBtn = document.getElementById('btn-norm-sound');
  const soundIcon = document.getElementById('icon-norm-sound');
  if (soundBtn && soundIcon) {
    soundBtn.classList.toggle('active', soundEnabled);
    soundIcon.textContent = soundEnabled ? 'volume_up' : 'volume_off';
  }

  const vibBtn = document.getElementById('btn-norm-vibrate');
  if (vibBtn) {
    vibBtn.classList.toggle('active', vibrationEnabled);
  }

  const histTitle = document.getElementById('norm-history-title');
  if (histTitle) {
    histTitle.textContent = t('calc_history', lang);
  }
}

/**
 * Format expression tokens with Lakh/Crore or International commas while keeping operators intact
 */
function formatExpressionForDisplay(expr, grouping, numSystem) {
  if (!expr) return formatDigits('0', numSystem);
  const parts = expr.split(/([+\−×÷%()])/g);
  return parts
    .map((part) => {
      if (/^\d+(\.\d*)?$/.test(part)) {
        return formatNumberWithGrouping(part, grouping, numSystem);
      }
      return formatDigits(part, numSystem);
    })
    .join('');
}

function updateDisplayUI() {
  const { lang, numSystem, numberGrouping } = store.getState();
  const exprEl = document.getElementById('norm-expr-display');
  const previewEl = document.getElementById('norm-preview-display');
  const memBadge = document.getElementById('norm-mem-indicator');

  if (!exprEl || !previewEl) return;

  // Memory badge visibility
  if (memBadge) {
    memBadge.classList.toggle('hidden', memoryValue.isZero());
    if (!memoryValue.isZero()) {
      memBadge.textContent = `M: ${formatNumberWithGrouping(memoryValue.toString(4), numberGrouping, numSystem)}`;
    }
  }

  const formattedExpr = formatExpressionForDisplay(currentExpr, numberGrouping, numSystem);
  exprEl.textContent = formattedExpr;

  // Auto-shrink display font on long inputs
  exprEl.classList.remove('font-shrink-md', 'font-shrink-sm');
  if (formattedExpr.length > 24) {
    exprEl.classList.add('font-shrink-sm');
  } else if (formattedExpr.length > 14) {
    exprEl.classList.add('font-shrink-md');
  }

  // Live preview evaluation
  if (!currentExpr) {
    currentPreview = '0';
    previewEl.classList.remove('is-error');
    previewEl.textContent = '= ' + formatDigits('0', numSystem);
    return;
  }

  const evalRes = evaluateNormalExpression(currentExpr);
  if (evalRes.ok) {
    currentPreview = evalRes.value;
    previewEl.classList.remove('is-error');
    previewEl.textContent = '= ' + formatNumberWithGrouping(evalRes.value, numberGrouping, numSystem);
  } else {
    previewEl.classList.add('is-error');
    const errKey = evalRes.error === 'DIV_ZERO' ? 'calc_div_zero' : 'calc_syntax_err';
    previewEl.textContent = t(errKey, lang);
  }
}

function handleNormalInput(key) {
  playKeyFeedback();
  const { lang } = store.getState();

  if (key === 'AC') {
    currentExpr = '';
    currentPreview = '0';
    updateDisplayUI();
    return;
  }

  if (key === 'BACKSPACE') {
    currentExpr = currentExpr.slice(0, -1);
    updateDisplayUI();
    return;
  }

  if (key === '±') {
    if (!currentExpr) {
      currentExpr = '−';
    } else if (currentExpr.startsWith('−')) {
      currentExpr = currentExpr.slice(1);
    } else {
      currentExpr = `−(${currentExpr})`;
    }
    updateDisplayUI();
    return;
  }

  if (key === '()') {
    const openCount = (currentExpr.match(/\(/g) || []).length;
    const closeCount = (currentExpr.match(/\)/g) || []).length;
    const lastChar = currentExpr.slice(-1);

    if (
      openCount > closeCount &&
      (/[\d%)]/.test(lastChar))
    ) {
      currentExpr += ')';
    } else {
      currentExpr += '(';
    }
    updateDisplayUI();
    return;
  }

  if (key === '.') {
    // Prevent duplicate decimal points in the current number segment
    const segments = currentExpr.split(/[+\−×÷()]/);
    const lastSegment = segments[segments.length - 1] || '';
    if (lastSegment.includes('.')) return;
    currentExpr += lastSegment === '' ? '0.' : '.';
    updateDisplayUI();
    return;
  }

  if (['+', '−', '×', '÷'].includes(key)) {
    if (!currentExpr && key !== '−') return;
    const lastChar = currentExpr.slice(-1);
    if (['+', '−', '×', '÷'].includes(lastChar)) {
      currentExpr = currentExpr.slice(0, -1) + key;
    } else {
      currentExpr += key;
    }
    updateDisplayUI();
    return;
  }

  if (key === '=') {
    if (!currentExpr) return;
    const evalRes = evaluateNormalExpression(currentExpr);
    if (!evalRes.ok) {
      const errKey = evalRes.error === 'DIV_ZERO' ? 'calc_div_zero' : 'calc_syntax_err';
      showSnackbar(t(errKey, lang), 'error');
      return;
    }

    const finalAns = evalRes.value;
    saveToNormalHistory(currentExpr, finalAns);
    currentExpr = finalAns.startsWith('-') ? '−' + finalAns.slice(1) : finalAns;
    updateDisplayUI();
    return;
  }

  // Digit or '%'
  currentExpr += key;
  updateDisplayUI();
}

function handleMemoryKey(memAction) {
  playKeyFeedback();
  const evalRes = evaluateNormalExpression(currentExpr || '0');
  const currentDec = evalRes.ok ? ExactDecimal.fromString(evalRes.value) : new ExactDecimal(0n);

  if (memAction === 'MC') {
    memoryValue = new ExactDecimal(0n);
  } else if (memAction === 'MR') {
    const memStr = memoryValue.toString(10);
    currentExpr += memStr.startsWith('-') ? '−' + memStr.slice(1) : memStr;
  } else if (memAction === 'M+') {
    memoryValue = memoryValue.add(currentDec);
  } else if (memAction === 'M-') {
    memoryValue = memoryValue.sub(currentDec);
  }
  updateDisplayUI();
}

async function saveToNormalHistory(expr, result) {
  const entry = await localDB.put(STORES.NORMAL_HISTORY, {
    expr,
    result,
    timestamp: Date.now()
  });
  historyItems.unshift(entry);
  renderHistoryList();
}

function renderHistoryList() {
  const listEl = document.getElementById('norm-history-list');
  if (!listEl) return;

  const { lang, numSystem, numberGrouping } = store.getState();

  if (!historyItems.length) {
    listEl.innerHTML = renderEmptyState('history', t('calc_no_history', lang));
    return;
  }

  listEl.innerHTML = historyItems
    .map((item) => {
      const dispExpr = formatExpressionForDisplay(item.expr, numberGrouping, numSystem);
      const dispRes = formatNumberWithGrouping(item.result, numberGrouping, numSystem);
      return `
        <div class="history-item" data-id="${item.id}">
          <button class="icon-btn btn-del-hist" data-del-id="${item.id}" title="${t('delete', lang)}">
            <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
          </button>
          <div class="history-item-content" data-use-id="${item.id}">
            <div class="history-expr">${dispExpr}</div>
            <div class="history-res">= ${dispRes}</div>
          </div>
        </div>
      `;
    })
    .join('');

  // Bind tap to reuse and swipe/click to delete
  listEl.querySelectorAll('[data-use-id]').forEach((el) => {
    el.addEventListener('click', () => {
      playKeyFeedback();
      const id = el.getAttribute('data-use-id');
      const found = historyItems.find((h) => h.id === id);
      if (found) {
        currentExpr = found.result.startsWith('-') ? '−' + found.result.slice(1) : found.result;
        updateDisplayUI();
      }
    });
  });

  listEl.querySelectorAll('[data-del-id]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      playKeyFeedback();
      const id = btn.getAttribute('data-del-id');
      await localDB.delete(STORES.NORMAL_HISTORY, id);
      historyItems = historyItems.filter((h) => h.id !== id);
      renderHistoryList();
    });
  });
}

function bindNormalCalculatorEvents(container) {
  // Keypad clicks
  container.querySelectorAll('#norm-keypad button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const num = btn.getAttribute('data-num');
      const key = btn.getAttribute('data-key');
      handleNormalInput(num !== null ? num : key);
    });
  });

  // Memory buttons
  container.querySelectorAll('[data-mem]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleMemoryKey(btn.getAttribute('data-mem'));
    });
  });

  // Grouping toggle (Lakh-Crore <-> International)
  document.getElementById('btn-norm-grouping')?.addEventListener('click', () => {
    playKeyFeedback();
    const nextGrp = store.getState().numberGrouping === 'lakh' ? 'intl' : 'lakh';
    store.setState({ numberGrouping: nextGrp });
  });

  // Sound toggle
  document.getElementById('btn-norm-sound')?.addEventListener('click', () => {
    const nextSound = !store.getState().soundEnabled;
    store.setState({ soundEnabled: nextSound });
    playKeyFeedback();
  });

  // Vibration toggle
  document.getElementById('btn-norm-vibrate')?.addEventListener('click', () => {
    const nextVib = !store.getState().vibrationEnabled;
    store.setState({ vibrationEnabled: nextVib });
    playKeyFeedback();
  });

  // Share calculation
  document.getElementById('btn-norm-share')?.addEventListener('click', () => {
    playKeyFeedback();
    const { numberGrouping, numSystem } = store.getState();
    const formattedExpr = formatExpressionForDisplay(currentExpr || '0', numberGrouping, numSystem);
    const formattedAns = formatNumberWithGrouping(currentPreview || '0', numberGrouping, numSystem);
    shareContent({
      title: 'ZenvX - Calculator',
      text: `${formattedExpr} = ${formattedAns}`
    });
  });

  // Run Unit Tests Modal
  document.getElementById('btn-norm-tests')?.addEventListener('click', () => {
    playKeyFeedback();
    const report = runNormalCalculatorUnitTests();
    const rowsHtml = report.results
      .map(
        (r) => `
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--divider-color); font-size:var(--text-sm);">
          <span>${r.desc} (<code>${r.expr}</code>)</span>
          <strong style="color:${r.passed ? 'var(--color-success)' : 'var(--color-error)'};">
            ${r.passed ? 'PASS' : 'FAIL'} (${r.actual})
          </strong>
        </div>`
      )
      .join('');

    openModal({
      title: `Unit Tests (${report.passedCount}/${report.total} Passed)`,
      bodyHtml: `<div>${rowsHtml}</div>`,
      actions: [{ label: t('close', store.getState().lang), className: 'btn-primary' }]
    });
  });

  // Long press or click on display result to copy
  const displayBox = document.getElementById('norm-display-box');
  if (displayBox) {
    displayBox.addEventListener('click', () => {
      const { numberGrouping, numSystem } = store.getState();
      copyToClipboard(formatNumberWithGrouping(currentPreview, numberGrouping, numSystem));
    });

    displayBox.addEventListener('touchstart', () => {
      longPressTimer = setTimeout(() => {
        const { numberGrouping, numSystem } = store.getState();
        copyToClipboard(formatNumberWithGrouping(currentPreview, numberGrouping, numSystem));
      }, 500);
    });
    displayBox.addEventListener('touchend', () => clearTimeout(longPressTimer));
  }

  // Clear all history
  document.getElementById('btn-norm-clear-history')?.addEventListener('click', async () => {
    playKeyFeedback();
    await localDB.clearStore(STORES.NORMAL_HISTORY);
    historyItems = [];
    renderHistoryList();
  });
}

function bindHardwareKeyboard() {
  window.addEventListener('keydown', (e) => {
    const { currentRoute, activeHomeTool } = store.getState();
    if (currentRoute !== 'home' || activeHomeTool !== 'normal-calc') return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    const key = e.key;
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      handleNormalInput(key);
    } else if (['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'].includes(key)) {
      e.preventDefault();
      handleNormalInput(toEnglishDigits(key));
    } else if (key === '+') {
      e.preventDefault();
      handleNormalInput('+');
    } else if (key === '-') {
      e.preventDefault();
      handleNormalInput('−');
    } else if (key === '*') {
      e.preventDefault();
      handleNormalInput('×');
    } else if (key === '/') {
      e.preventDefault();
      handleNormalInput('÷');
    } else if (key === '%' || key === '.') {
      e.preventDefault();
      handleNormalInput(key);
    } else if (key === '(' || key === ')') {
      e.preventDefault();
      currentExpr += key;
      updateDisplayUI();
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      handleNormalInput('=');
    } else if (key === 'Backspace') {
      e.preventDefault();
      handleNormalInput('BACKSPACE');
    } else if (key === 'Escape' || key === 'Delete') {
      e.preventDefault();
      handleNormalInput('AC');
    }
  });
}
