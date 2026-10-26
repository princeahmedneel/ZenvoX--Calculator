/**
 * ZenvX - Calculator
 * File: js/core/ui-components.js
 * Purpose: Reusable UI Widget Library (Snackbar, Modal Dialog, Skeleton Loader,
 *          Empty/Error States, Web Audio Key Click Sound, Haptic Vibration,
 *          LaTeX Renderer, and Input Sanitizer).
 */

import { store } from './state.js';
import { t } from '../config/i18n.js';

let audioCtx = null;

/**
 * Synthesize a subtle mechanical calculator key click sound using Web Audio API
 * (Zero external MP3 dependency — works 100% offline)
 */
export function playKeyFeedback() {
  const { soundEnabled, vibrationEnabled } = store.getState();

  if (vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(12);
    } catch (_) {
      // Ignore on unsupported devices
    }
  }

  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.025);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.026);
  } catch (_) {
    // Audio context blocked or unavailable
  }
}

/**
 * Show a non-intrusive toast/snackbar message
 */
export function showSnackbar(message, type = 'info', duration = 3000) {
  const container = document.getElementById('snackbar-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'snackbar';

  if (type === 'error') {
    el.style.backgroundColor = 'var(--color-error)';
    el.style.color = '#FFFFFF';
  } else if (type === 'success') {
    el.style.backgroundColor = 'var(--color-success)';
    el.style.color = '#FFFFFF';
  }

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  el.appendChild(textSpan);

  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style. transition = 'opacity 200ms ease';
    setTimeout(() => el.remove(), 220);
  }, duration);
}

/**
 * Open the global modal dialog with custom title, HTML/DOM body, and action buttons
 */
export function openModal({ title, bodyHtml, actions = [] }) {
  const backdrop = document.getElementById('global-modal-backdrop');
  const titleEl = document.getElementById('global-modal-title');
  const bodyEl = document.getElementById('global-modal-body');
  const footerEl = document.getElementById('global-modal-footer');
  const closeBtn = document.getElementById('global-modal-close');

  if (!backdrop || !titleEl || !bodyEl || !footerEl) return;

  titleEl.textContent = title || 'ZenvX - Calculator';
  bodyEl.innerHTML = bodyHtml || '';
  footerEl.innerHTML = '';

  actions.forEach((act) => {
    const btn = document.createElement('button');
    btn.className = `btn ${act.className || 'btn-primary'}`;
    btn.textContent = act.label;
    btn.addEventListener('click', () => {
      if (act.onClick) act.onClick();
      if (act.closeOnClick !== false) closeModal();
    });
    footerEl.appendChild(btn);
  });

  backdrop.classList.remove('hidden');

  closeBtn.onclick = () => closeModal();
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal();
  };
}

export function closeModal() {
  const backdrop = document.getElementById('global-modal-backdrop');
  if (backdrop) backdrop.classList.add('hidden');
}

/**
 * Copy text to clipboard and show confirmation snackbar
 */
export async function copyToClipboard(text) {
  const { lang } = store.getState();
  try {
    await navigator.clipboard.writeText(String(text));
    showSnackbar(t('copied_msg', lang), 'success');
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = String(text);
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    showSnackbar(t('copied_msg', lang), 'success');
  }
}

/**
 * Share content using Web Share API or fallback to clipboard copy
 */
export async function shareContent({ title = 'ZenvX - Calculator', text = '', url = '' }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: url || window.location.href });
      return;
    } catch (_) {
      // User cancelled share sheet
    }
  }
  await copyToClipboard(`${title}\n${text}`);
}

/**
 * Escape HTML special characters to prevent XSS attacks on all user inputs
 */
export function sanitizeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render mixed text containing LaTeX ($...$ or $$...$$) using KaTeX
 */
export function renderMathInText(rawText) {
  const safe = sanitizeHTML(rawText);
  if (typeof window.katex === 'undefined') {
    return safe.replace(/\n/g, '<br>');
  }

  // Replace block math $$...$$
  let processed = safe.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return window.katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<code>${tex}</code>`;
    }
  });

  // Replace inline math $...$
  processed = processed.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    try {
      return window.katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<code>${tex}</code>`;
    }
  });

  return processed.replace(/\n/g, '<br>');
}

/**
 * Generate HTML for Loading Skeleton, Empty State, or Error State
 */
export function renderSkeletonCards(count = 3) {
  return Array.from({ length: count })
    .map(
      () => `
      <div class="card">
        <div class="skeleton" style="height: 20px; width: 55%; margin-bottom: 12px;"></div>
        <div class="skeleton" style="height: 14px; width: 90%; margin-bottom: 8px;"></div>
        <div class="skeleton" style="height: 14px; width: 75%;"></div>
      </div>`
    )
    .join('');
}

export function renderEmptyState(iconName, message) {
  return `
    <div class="state-box">
      <span class="material-symbols-rounded">${sanitizeHTML(iconName)}</span>
      <p>${sanitizeHTML(message)}</p>
    </div>
  `;
}
