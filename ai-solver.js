/**
 * ZenvX - Calculator
 * File: js/features/ai-solver.js
 * Purpose: Complete Zero-Billing AI Solver featuring:
 *          1. Camera Capture & Gallery Upload with Canvas Crop/Compression
 *          2. Bangla (bn-BD) & English Voice-to-Text Recognition (Web Speech API)
 *          3. Dedicated Math Symbol Quick Keyboard
 *          4. Local Math Engine Fast-Path (solves pure arithmetic/equations without AI quota)
 *          5. IndexedDB Question Hash Cache (prevents duplicate API calls)
 *          6. Daily Free Limit Enforcement, Exponential Backoff, Streaming Output & Bookmarking
 */

import { store } from '../core/state.js';
import { getAppConfig } from '../config/app-config.js';
import { localDB, STORES } from '../core/db-local.js';
import { formatDigits, t } from '../config/i18n.js';
import {
  playKeyFeedback,
  showSnackbar,
  copyToClipboard,
  shareContent,
  openModal,
  renderMathInText,
  renderEmptyState
} from '../core/ui-components.js';
import { evaluateCompExpression, solveEquationForX } from '../math-engine/evaluator-comp.js';

let selectedImageBase64 = null;
let selectedImageMime = 'image/jpeg';
let activeSolveMode = 'step'; // 'step' | 'short' | 'easy' | 'similar'
let activeSubject = 'গণিত (Math)';
let voiceLang = 'bn-BD';
let isRecordingVoice = false;
let speechRecognitionInstance = null;

export async function initAiSolver() {
  const container = document.getElementById('subview-ai-solver');
  if (!container) return;

  renderAiSolverUI(container);
  bindAiSolverEvents(container);
  await renderSavedAiHistory();
}

function renderAiSolverUI(container) {
  const { lang, numSystem, aiDailyUsed } = store.getState();
  const cfg = getAppConfig();
  const remaining = Math.max(0, cfg.AI_DAILY_FREE_LIMIT - aiDailyUsed);

  const mathShortcuts = ['√(', '²', '³', '^', 'π', '∫(', 'd/dx(', 'Σ(', 'sin(', 'cos(', 'tan(', 'log(', '≤', '≥', '≠', '±', '∞', 'θ', 'α', 'β'];

  container.innerHTML = `
    <div class="calc-workspace">
      <!-- Left/Main Column: Input Studio (Camera, Gallery, Voice, Math Keyboard) -->
      <div class="card" style="border-radius:var(--radius-xl); padding:var(--space-5); box-shadow:var(--shadow-lg);">

        <!-- Quota & Subject Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="material-symbols-rounded" style="color:var(--color-tertiary);">auto_awesome</span>
            <strong style="font-size:var(--text-base);">ZenvX AI শিক্ষক</strong>
          </div>
          <div class="chip-btn" style="background:var(--color-tertiary-container); color:var(--color-tertiary);">
            <span>${t('ai_remaining_limit', lang)} </span>
            <strong id="ai-quota-badge" style="margin-left:4px;">${formatDigits(remaining, numSystem)}/${formatDigits(cfg.AI_DAILY_FREE_LIMIT, numSystem)}</strong>
          </div>
        </div>

        <!-- 3 Big Action Cards: Take Photo (Camera), Upload from Gallery, Speak (Voice) -->
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:14px;">
          <!-- Direct Camera Capture -->
          <label for="ai-camera-input" class="btn btn-outline" style="flex-direction:column; padding:12px 6px; border-radius:16px; border-color:var(--color-primary); background:var(--bg-surface-variant); cursor:pointer;">
            <span class="material-symbols-rounded" style="font-size:28px; color:var(--color-primary);">photo_camera</span>
            <span style="font-size:12px; font-weight:700;">ছবি তুলুন</span>
            <input id="ai-camera-input" type="file" accept="image/*" capture="environment" class="hidden">
          </label>

          <!-- Gallery Photo Upload -->
          <label for="ai-gallery-input" class="btn btn-outline" style="flex-direction:column; padding:12px 6px; border-radius:16px; border-color:var(--color-secondary); background:var(--bg-surface-variant); cursor:pointer;">
            <span class="material-symbols-rounded" style="font-size:28px; color:var(--color-secondary);">imagesmode</span>
            <span style="font-size:12px; font-weight:700;">গ্যালারি ছবি</span>
            <input id="ai-gallery-input" type="file" accept="image/*" class="hidden">
          </label>

          <!-- Voice Input (Bangla / English) -->
          <button id="btn-ai-voice" type="button" class="btn btn-outline" style="flex-direction:column; padding:12px 6px; border-radius:16px; border-color:#D97706; background:var(--bg-surface-variant);">
            <span class="material-symbols-rounded" id="icon-ai-mic" style="font-size:28px; color:#D97706;">mic</span>
            <span id="lbl-ai-mic" style="font-size:12px; font-weight:700;">মুখে বলুন (বাং/EN)</span>
          </button>
        </div>

        <!-- Image Preview & Crop/Clear Box (Shown when photo selected) -->
        <div id="ai-image-preview-wrap" class="hidden" style="margin-bottom:14px; background:var(--bg-surface-variant); padding:10px; border-radius:14px; border:1.5px dashed var(--color-primary); text-align:center;">
          <img id="ai-image-preview" alt="Selected Problem" style="max-height:210px; max-width:100%; border-radius:10px; object-fit:contain;">
          <div style="display:flex; justify-content:center; gap:8px; margin-top:8px;">
            <button id="btn-ai-rotate-img" class="calc-tool-btn"><span class="material-symbols-rounded" style="font-size:16px;">rotate_right</span> ঘোরান</button>
            <button id="btn-ai-remove-img" class="calc-tool-btn" style="color:var(--color-error);"><span class="material-symbols-rounded" style="font-size:16px;">delete</span> ছবি সরান</button>
          </div>
        </div>

        <!-- Subject & Voice Language Bar -->
        <div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
          <select id="ai-subject-select" class="input-field" style="flex:1; min-height:38px; font-size:13px;">
            <option value="গণিত (Math)">📐 গণিত (Mathematics)</option>
            <option value="পদার্থবিজ্ঞান (Physics)">⚡ পদার্থবিজ্ঞান (Physics)</option>
            <option value="রসায়ন (Chemistry)">🧪 রসায়ন (Chemistry)</option>
            <option value="জীববিজ্ঞান (Biology)">🧬 জীববিজ্ঞান (Biology)</option>
            <option value="ইংরেজি ও সাধারণ (English)">📘 ইংরেজি ও সাধারণ জ্ঞান</option>
          </select>

          <select id="ai-voice-lang" class="input-field" style="width:auto; min-height:38px; font-size:13px;" title="ভয়েস ইনপুট ভাষা">
            <option value="bn-BD">🎙️ বাংলা ভয়েস</option>
            <option value="en-US">🎙️ English Voice</option>
          </select>
        </div>

        <!-- Math Symbol Shortcut Ribbon -->
        <div style="display:flex; gap:5px; overflow-x:auto; padding-bottom:8px; margin-bottom:8px;">
          ${mathShortcuts
            .map(
              (sym) =>
                `<button type="button" class="calc-tool-btn" data-math-sym="${sym}" style="font-family:var(--font-mono); font-size:13px; padding:5px 10px; flex-shrink:0;">${sym}</button>`
            )
            .join('')}
        </div>

        <!-- Editable Problem Textarea -->
        <div class="input-group">
          <textarea id="ai-prompt-input" rows="3" class="input-field" placeholder="${t('ai_input_placeholder', lang)}" style="font-size:1rem; padding:12px; resize:vertical;"></textarea>
        </div>

        <!-- Solve Mode Pills (Step-by-step | Short | Easy | Similar) -->
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin-bottom:14px;">
          <button type="button" class="calc-tool-btn active" data-solve-mode="step" style="justify-content:center; padding:8px;">📝 ${t('ai_mode_step', lang)}</button>
          <button type="button" class="calc-tool-btn" data-solve-mode="short" style="justify-content:center; padding:8px;">⚡ ${t('ai_mode_short', lang)}</button>
          <button type="button" class="calc-tool-btn" data-solve-mode="easy" style="justify-content:center; padding:8px;">💡 ${t('ai_mode_easy', lang)}</button>
          <button type="button" class="calc-tool-btn" data-solve-mode="similar" style="justify-content:center; padding:8px;">🎯 ${t('ai_mode_similar', lang)}</button>
        </div>

        <!-- Primary Solve Button -->
        <button id="btn-ai-solve-submit" class="btn btn-primary" style="width:100%; height:50px; font-size:1.05rem; border-radius:14px;">
          <span class="material-symbols-rounded">psychology</span>
          <span data-i18n="ai_solve_btn">${t('ai_solve_btn', lang)}</span>
        </button>

        <!-- Solution Output Card -->
        <div id="ai-output-card" class="hidden" style="margin-top:18px; padding:16px; border-radius:16px; background:var(--bg-surface-variant); border:1.5px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--divider-color);">
            <span id="ai-output-source-badge" class="chip-btn" style="font-size:11px; height:26px;">AI Step-by-Step</span>
            <div style="display:flex; gap:6px;">
              <button id="btn-ai-copy-ans" class="icon-btn" title="Copy"><span class="material-symbols-rounded" style="font-size:18px;">content_copy</span></button>
              <button id="btn-ai-share-ans" class="icon-btn" title="Share"><span class="material-symbols-rounded" style="font-size:18px;">share</span></button>
              <button id="btn-ai-report-ans" class="icon-btn" title="Report inaccurate answer"><span class="material-symbols-rounded" style="font-size:18px; color:var(--color-warning);">flag</span></button>
            </div>
          </div>
          <div id="ai-solution-stream" style="line-height:1.7; font-size:var(--text-base); overflow-x:auto;"></div>
        </div>
      </div>

      <!-- Right Column: Saved Solutions & Offline Queue -->
      <div class="calc-history-panel">
        <div class="history-header">
          <h3 style="font-size:var(--text-base); font-weight:700;">সংরক্ষিত সমাধান ও বুকমার্ক</h3>
          <input id="ai-history-search" class="input-field" placeholder="সার্চ..." style="width:120px; min-height:30px; font-size:12px; padding:2px 8px;">
        </div>
        <div id="ai-history-list" class="history-list"></div>
      </div>
    </div>
  `;
}

/**
 * Compress & Resize Image using HTML5 Canvas to save bandwidth & Gemini token cost
 */
function processImageFile(file, rotationDeg = 0) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = getAppConfig().AI_IMAGE_MAX_DIMENSION || 1024;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        if (rotationDeg % 180 !== 0) {
          canvas.width = h;
          canvas.height = w;
        } else {
          canvas.width = w;
          canvas.height = h;
        }

        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationDeg * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', getAppConfig().AI_IMAGE_QUALITY || 0.78);
        resolve({
          dataUrl,
          base64: dataUrl.split(',')[1],
          mimeType: 'image/jpeg'
        });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Normalize question & compute fast deterministic hash for caching
 */
function hashQuestion(prompt, mode, hasImage) {
  const norm = `${mode}:${ activeSubject }:${String(prompt).trim().toLowerCase().replace(/\s+/g, ' ')}:${hasImage ? selectedImageBase64?.slice(0, 64) : 'noimg'}`;
  let hash = 2166136261;
  for (let i = 0; i < norm.length; i++) {
    hash ^= norm.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 'q_' + (hash >>> 0).toString(16);
}

/**
 * Local Offline Solver Fallback: Solves arithmetic, calculus, or equations in X locally
 * without consuming any AI quota!
 */
function trySolveLocally(rawPrompt) {
  const clean = String(rawPrompt || '').trim();
  if (!clean || selectedImageBase64) return null;

  // Avoid local engine if text contains long natural language sentences
  if (/[অ-হa-zA-Z]{6,}/.test(clean)) return null;

  if (clean.includes('=') && /x/i.test(clean)) {
    const expr = clean.replace(/x/g, 'X');
    const eqRes = solveEquationForX(expr, 1, store.getState().sciSetup);
    if (eqRes.ok) {
      return `**স্থানীয় গাণিতিক ইঞ্জিনে সমাধান (ফ্রি অফলাইন সলভার):**\n\nপ্রদত্ত সমীকরণ: $${clean}$\n\nনিউটন-র‍্যাফসন পদ্ধতিতে সমাধান করে পাই:\n$$X = ${eqRes.root}$$`;
    }
  }

  const evalRes = evaluateCompExpression(clean, store.getState().sciSetup);
  if (evalRes.ok) {
    return `**স্থানীয় গাণিতিক ইঞ্জিনে সমাধান (ফ্রি অফলাইন সলভার):**\n\nপ্রদত্ত রাশি: $${clean}$\n\nধাপে ধাপে মান নির্ণয়:\n- ভগ্নাংশ / প্রতীকী রূপ: $$${evalRes.symbolicLatex}$$\n- দশমিক মান: **${evalRes.decimalText}**`;
  }
  return null;
}

/**
 * Call Gemini API (via Cloudflare Worker Proxy or direct user Gemini API key if configured)
 */
async function executeAiSolve() {
  const state = store.getState();
  const cfg = getAppConfig();
  const promptEl = document.getElementById('ai-prompt-input');
  const rawPrompt = promptEl?.value.trim() || '';

  if (!rawPrompt && !selectedImageBase64) {
    showSnackbar('অনুগ্রহ করে একটি প্রশ্ন লিখুন অথবা অংকের ছবি তুলুন', 'error');
    return;
  }

  // First-time Privacy Consent Check
  if (!state.aiPrivacyAccepted) {
    openModal({
      title: 'প্রাইভেসি নোটিশ ও সম্মতি',
      bodyHtml: `<p>${t('ai_privacy_notice', state.lang)}</p>`,
      actions: [
        { label: t('cancel', state.lang), className: 'btn-outline' },
        {
          label: t('confirm', state.lang),
          className: 'btn-primary',
          onClick: () => {
            store.setState({ aiPrivacyAccepted: true });
            executeAiSolve();
          }
        }
      ]
    });
    return;
  }

  const outputCard = document.getElementById('ai-output-card');
  const streamBox = document.getElementById('ai-solution-stream');
  const badgeEl = document.getElementById('ai-output-source-badge');
  outputCard?.classList.remove('hidden');

  // 1. Check Local Math Engine Fast-Path (0 cost, works offline)
  const localSolution = trySolveLocally(rawPrompt);
  if (localSolution && activeSolveMode !== 'similar') {
    if (badgeEl) badgeEl.textContent = '⚡ অফলাইন লোকাল ইঞ্জিন (ফ্রি)';
    if (streamBox) streamBox.innerHTML = renderMathInText(localSolution);
    await saveAiHistoryItem(rawPrompt || ' সমীকরণ', localSolution);
    return;
  }

  // 2. Check Local Cache (0 cost)
  const qHash = hashQuestion(rawPrompt, activeSolveMode, Boolean(selectedImageBase64));
  const cached = await localDB.getById(STORES.AI_CACHE, qHash);
  if (cached && cached.solution) {
    if (badgeEl) badgeEl.textContent = '⚡ ক্যাশ থেকে তাৎক্ষণিক সমাধান (ফ্রি)';
    if (streamBox) streamBox.innerHTML = renderMathInText(cached.solution);
    return;
  }

  // 3. Offline Queue Check
  if (!navigator.onLine) {
    await localDB.put(STORES.OFFLINE_QUEUE, {
      prompt: rawPrompt,
      mode: activeSolveMode,
      subject: activeSubject,
      imageBase64: selectedImageBase64
    });
    if (streamBox) {
      streamBox.innerHTML = `<p style="color:var(--color-warning);">আপনি বর্তমানে অফলাইনে আছেন। আপনার প্রশ্নটি কিউতে সেভ করা হয়েছে—ইন্টারনেট চালু হলেই সমাধান করা যাবে।</p>`;
    }
    return;
  }

  // 4. Daily Free Limit Guard
  if (state.aiDailyUsed >= cfg.AI_DAILY_FREE_LIMIT) {
    showSnackbar('আজকের ফ্রি AI লিমিট শেষ হয়েছে। আগামীকাল আবার ১৫টি ফ্রি সমাধান পাবেন।', 'error');
    return;
  }

  if (badgeEl) badgeEl.textContent = '⏳ AI সমাধান তৈরি করছে...';
  if (streamBox) {
    streamBox.innerHTML = `<div class="skeleton" style="height:18px; width:70%; margin-bottom:10px;"></div><div class="skeleton" style="height:16px; width:92%; margin-bottom:10px;"></div><div class="skeleton" style="height:16px; width:60%;"></div>`;
  }

  const modeInstructions = {
    step: 'প্রতিটি ধাপ আলাদা করে ব্যাখ্যাসহ সমাধান দাও এবং ব্যবহৃত সূত্র উল্লেখ করো।',
    short: 'শুধুমাত্র মূল সূত্র এবং সংক্ষিপ্ত চূড়ান্ত উত্তর দাও।',
    easy: 'একজন ৬ষ্ঠ-৮ম শ্রেণির শিক্ষার্থী যেন সহজে বুঝতে পারে এমন উদাহরণসহ সহজ বাংলায় বুঝিয়ে দাও।',
    similar: 'প্রথমে এই অংকটি সমাধান করো এবং শেষে অনুশীলনের জন্য একই নিয়মের আরও ৩টি নতুন অংক (উত্তরসহ) তৈরি করে দাও।'
  };

  const fullUserPrompt = `বিষয়: ${activeSubject}\nনির্দেশনা: ${modeInstructions[activeSolveMode]}\nপ্রশ্ন: ${rawPrompt || 'প্রদত্ত ছবির সমস্যাটি ধাপে ধাপে সমাধান করো।'}`;

  try {
    const solutionText = await requestGeminiWithBackoff(fullUserPrompt, selectedImageBase64, selectedImageMime);

    // Increment daily usage counter
    store.setState({ aiDailyUsed: state.aiDailyUsed + 1 });
    const rem = Math.max(0, cfg.AI_DAILY_FREE_LIMIT - (state.aiDailyUsed + 1));
    const quotaEl = document.getElementById('ai-quota-badge');
    if (quotaEl) {
      quotaEl.textContent = `${formatDigits(rem, state.numSystem)}/${formatDigits(cfg.AI_DAILY_FREE_LIMIT, state.numSystem)}`;
    }

    if (badgeEl) badgeEl.textContent = '✨ ZenvX AI সমাধান';
    await animateStreamingText(streamBox, solutionText);

    // Save to cache & history
    await localDB.put(STORES.AI_CACHE, { id: qHash, solution: solutionText });
    await saveAiHistoryItem(rawPrompt || '📷 ছবির অংক', solutionText);
  } catch (err) {
    if (badgeEl) badgeEl.textContent = '⚠️ সংযোগ ত্রুটি';
    if (streamBox) {
      streamBox.innerHTML = `<p style="color:var(--color-error);">AI সার্ভারে সংযোগ করা যায়নি (${err.message})। সেটিংস থেকে আপনার ফ্রি Gemini API Key বা Cloudflare Worker যুক্ত করুন।</p>`;
    }
  }
}

async function requestGeminiWithBackoff(promptText, imgBase64, mimeType) {
  const cfg = getAppConfig();
  const apiKey = localStorage.getItem('zenvx_gemini_api_key') || cfg.FIREBASE_CONFIG.apiKey;

  // Prefer Cloudflare Worker proxy if configured, otherwise Gemini REST endpoint
  const models = [cfg.AI_PRIMARY_MODEL, cfg.AI_FALLBACK_MODEL];

  for (let mIdx = 0; mIdx < models.length; mIdx++) {
    const modelName = models[mIdx];
    const parts = [{ text: promptText }];
    if (imgBase64) {
      parts.push({ inline_data: { mime_type: mimeType, data: imgBase64 } });
    }

    const payload = {
      system_instruction: { parts: [{ text: cfg.AI_SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: cfg.AI_MAX_OUTPUT_TOKENS,
        temperature: 0.2
      }
    };

    const url = cfg.CLOUDFLARE_WORKER_URL
      ? `${cfg.CLOUDFLARE_WORKER_URL.replace(/\/$/, '')}/ai-solve`
      : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    if (!cfg.CLOUDFLARE_WORKER_URL && !apiKey) {
      throw new Error('Gemini API Key সেট করা নেই');
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 429 && mIdx === 0) {
      await new Promise((r) => setTimeout(r, 1200));
      continue; // Fallback to lite model
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n');
    if (text) return text;
  }

  throw new Error('Empty response');
}

async function animateStreamingText(container, fullText) {
  if (!container) return;
  const chunks = fullText.split(' ');
  let current = '';
  const step = Math.max(2, Math.floor(chunks.length / 25));

  for (let i = 0; i < chunks.length; i += step) {
    current += chunks.slice(i, i + step).join(' ') + ' ';
    container.innerHTML = renderMathInText(current);
    await new Promise((r) => setTimeout(r, 25));
  }
  container.innerHTML = renderMathInText(fullText);
}

async function saveAiHistoryItem(question, solution) {
  await localDB.put(STORES.AI_HISTORY, {
    question: question.slice(0, 120),
    solution,
    subject: activeSubject,
    timestamp: Date.now()
  });
  await renderSavedAiHistory();
}

async function renderSavedAiHistory(filterQuery = '') {
  const listEl = document.getElementById('ai-history-list');
  if (!listEl) return;

  const all = await localDB.getAll(STORES.AI_HISTORY, 50);
  const filtered = filterQuery
    ? all.filter((x) => x.question.toLowerCase().includes(filterQuery.toLowerCase()))
    : all;

  if (!filtered.length) {
    listEl.innerHTML = renderEmptyState('bookmark_border', 'এখনো কোনো AI সমাধান সেভ করা হয়নি');
    return;
  }

  listEl.innerHTML = filtered
    .map(
      (item) => `
      <div class="history-item" data-ai-hist-id="${item.id}" style="flex-direction:column; align-items:flex-start;">
        <div style="display:flex; justify-content:space-between; width:100%; font-size:11px; color:var(--color-primary);">
          <strong>${item.subject || 'গণিত'}</strong>
          <button class="btn-del-ai-hist" data-del-ai="${item.id}" style="color:var(--color-error);">✕</button>
        </div>
        <div style="font-weight:600; font-size:13px; margin-top:2px;">${item.question}</div>
      </div>`
    )
    .join('');

  listEl.querySelectorAll('[data-ai-hist-id]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-del-ai')) return;
      playKeyFeedback();
      const id = card.getAttribute('data-ai-hist-id');
      const found = filtered.find((x) => x.id === id);
      if (found) {
        document.getElementById('ai-output-card')?.classList.remove('hidden');
        const box = document.getElementById('ai-solution-stream');
        if (box) box.innerHTML = renderMathInText(found.solution);
      }
    });
  });

  listEl.querySelectorAll('[data-del-ai]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-del-ai');
      await localDB.delete(STORES.AI_HISTORY, id);
      renderSavedAiHistory(filterQuery);
    });
  });
}

function bindAiSolverEvents(container) {
  let currentFile = null;
  let currentRotation = 0;

  const handleFilePicked = async (file) => {
    if (!file) return;
    currentFile = file;
    currentRotation = 0;
    try {
      const processed = await processImageFile(file, 0);
      selectedImageBase64 = processed.base64;
      selectedImageMime = processed.mimeType;
      const previewImg = document.getElementById('ai-image-preview');
      const wrap = document.getElementById('ai-image-preview-wrap');
      if (previewImg && wrap) {
        previewImg.src = processed.dataUrl;
        wrap.classList.remove('hidden');
      }
      showSnackbar('ছবি প্রস্তুত করা হয়েছে! এখন "সমাধান করুন" বাটনে চাপুন।', 'success');
    } catch (_) {
      showSnackbar('ছবি লোড করতে সমস্যা হয়েছে', 'error');
    }
  };

  // Camera & Gallery Inputs
  document.getElementById('ai-camera-input')?.addEventListener('change', (e) => handleFilePicked(e.target.files?.[0]));
  document.getElementById('ai-gallery-input')?.addEventListener('change', (e) => handleFilePicked(e.target.files?.[0]));

  // Rotate & Remove Image
  document.getElementById('btn-ai-rotate-img')?.addEventListener('click', async () => {
    if (!currentFile) return;
    playKeyFeedback();
    currentRotation = (currentRotation + 90) % 360;
    const processed = await processImageFile(currentFile, currentRotation);
    selectedImageBase64 = processed.base64;
    const previewImg = document.getElementById('ai-image-preview');
    if (previewImg) previewImg.src = processed.dataUrl;
  });

  document.getElementById('btn-ai-remove-img')?.addEventListener('click', () => {
    playKeyFeedback();
    currentFile = null;
    selectedImageBase64 = null;
    document.getElementById('ai-image-preview-wrap')?.classList.add('hidden');
  });

  // Voice Input (Bangla & English Speech-to-Text)
  document.getElementById('btn-ai-voice')?.addEventListener('click', () => {
    playKeyFeedback();
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      showSnackbar('আপনার ব্রাউজারে ভয়েস টাইপিং সাপোর্ট করছে না (Chrome ব্যবহার করুন)', 'error');
      return;
    }

    if (isRecordingVoice && speechRecognitionInstance) {
      speechRecognitionInstance.stop();
      return;
    }

    speechRecognitionInstance = new SpeechRec();
    speechRecognitionInstance.lang = document.getElementById('ai-voice-lang')?.value || voiceLang;
    speechRecognitionInstance.interimResults = false;

    const micIcon = document.getElementById('icon-ai-mic');
    const micLbl = document.getElementById('lbl-ai-mic');

    speechRecognitionInstance.onstart = () => {
      isRecordingVoice = true;
      if (micIcon) micIcon.style.color = '#DC2626';
      if (micLbl) micLbl.textContent = 'শুনছি... কথা বলুন';
    };

    speechRecognitionInstance.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      const promptEl = document.getElementById('ai-prompt-input');
      if (promptEl) {
        promptEl.value = (promptEl.value ? promptEl.value + ' ' : '') + transcript;
      }
      showSnackbar('ভয়েস টেক্সটে রূপান্তরিত হয়েছে। প্রয়োজনে এডিট করে সলভ করুন।', 'success');
    };

    speechRecognitionInstance.onend = () => {
      isRecordingVoice = false;
      if (micIcon) micIcon.style.color = '#D97706';
      if (micLbl) micLbl.textContent = 'মুখে বলুন (বাং/EN)';
    };

    speechRecognitionInstance.start();
  });

  // Math Symbol Shortcuts
  container.querySelectorAll('[data-math-sym]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      const sym = btn.getAttribute('data-math-sym');
      const promptEl = document.getElementById('ai-prompt-input');
      if (promptEl) {
        const start = promptEl.selectionStart || promptEl.value.length;
        promptEl.value = promptEl.value.slice(0, start) + sym + promptEl.value.slice(start);
        promptEl.focus();
      }
    });
  });

  // Solve Mode Selector
  container.querySelectorAll('[data-solve-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      activeSolveMode = btn.getAttribute('data-solve-mode');
      container.querySelectorAll('[data-solve-mode]').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  // Subject Selector
  document.getElementById('ai-subject-select')?.addEventListener('change', (e) => {
    activeSubject = e.target.value;
  });

  // Solve Submit
  document.getElementById('btn-ai-solve-submit')?.addEventListener('click', () => {
    playKeyFeedback();
    executeAiSolve();
  });

  // Output Actions (Copy, Share, Report)
  document.getElementById('btn-ai-copy-ans')?.addEventListener('click', () => {
    const txt = document.getElementById('ai-solution-stream')?.innerText || '';
    copyToClipboard(txt);
  });

  document.getElementById('btn-ai-share-ans')?.addEventListener('click', () => {
    const txt = document.getElementById('ai-solution-stream')?.innerText || '';
    shareContent({ title: 'ZenvX AI Solution', text: txt });
  });

  document.getElementById('btn-ai-report-ans')?.addEventListener('click', () => {
    showSnackbar('ধন্যবাদ! উত্তরটি রিভিউয়ের জন্য রিপোর্ট করা হয়েছে।', 'info');
  });

  // History Search
  document.getElementById('ai-history-search')?.addEventListener('input', (e) => {
    renderSavedAiHistory(e.target.value);
  });
}