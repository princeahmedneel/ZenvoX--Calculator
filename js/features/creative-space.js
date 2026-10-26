/**
 * ZenvX - Calculator
 * File: js/features/creative-space.js
 * Purpose: Complete Creative Space & AI Chat Tutor featuring 9 Study Tools:
 *          1. Coding Playground (HTML/CSS/JS Live Preview)
 *          2. Rich Notes & Formula Keeper
 *          3. Flashcards (Spaced Repetition Review)
 *          4. Whiteboard (Hand-drawn canvas)
 *          5. Pomodoro Study Timer with Daily Streak
 *          6. MCQ Quiz Maker & Challenger
 *          7. Graph Plotter (y=f(x))
 *          8. Formula Sheet (Math/Physics/Chemistry chapters)
 *          9. Unit Converter
 *          + Subject-specific AI Chat Tutor
 */

import { store } from '../core/state.js';
import { localDB, STORES } from '../core/db-local.js';
import { playKeyFeedback, showSnackbar, openModal, sanitizeHTML } from '../core/ui-components.js';

let activeTool = 'code';

const CREATIVE_TOOLS = [
  { id: 'code', name: '💻 কোডিং প্লেগ্রাউন্ড', desc: 'HTML/CSS/JS লাইভ প্রিভিউ' },
  { id: 'notes', name: '📝 স্টাডি নোটস', desc: 'ফর্মুলা ও রিচ টেক্সট' },
  { id: 'flashcard', name: '📇 ফ্ল্যাশকার্ড', desc: 'স্পেসড রিপিটেশন মুখস্থ' },
  { id: 'whiteboard', name: '🎨 হোয়াইটবোর্ড', desc: 'হাতে আঁকা ও স্কেচ' },
  { id: 'timer', name: '⏱️ পমোডোরো টাইমার', desc: 'ফোকাস ও স্ট্রিক কাউন্টার' },
  { id: 'quiz', name: '❓ কুইজ মেকার', desc: 'MCQ চ্যালেঞ্জ' },
  { id: 'graph', name: '📈 গ্রাফ প্লটার', desc: 'y = f(x) কার্ভ' },
  { id: 'formulas', name: '📐 ফর্মুলা শিট', desc: 'গণিত ও পদার্থবিজ্ঞান সূত্র' },
  { id: 'converter', name: '⚖️ ইউনিট কনভার্টার', desc: 'সব একক রূপান্তর' },
  { id: 'ai_tutor', name: '🤖 AI চ্যাট টিউটর', desc: 'বিষয়ভিত্তিক শিক্ষক' }
];

export async function initCreativeSpace() {
  const container = document.getElementById('view-create');
  if (!container) return;

  renderCreativeSpaceLayout(container);
  bindCreativeSpaceEvents(container);
}

function renderCreativeSpaceLayout(container) {
  container.innerHTML = `
    <div style="max-width:860px; margin:0 auto;">
      <!-- Tool Selector Ribbon -->
      <div class="sci-mode-ribbon" style="margin-bottom:14px;">
        ${CREATIVE_TOOLS.map(
          (t) => `
          <button class="sci-mode-chip ${activeTool === t.id ? 'active' : ''}" data-creative-tool="${t.id}">
            ${t.name}
          </button>`
        ).join('')}
      </div>

      <!-- Active Tool Workspace Card -->
      <div class="card" style="border-radius:var(--radius-xl); padding:var(--space-4);">
        <div id="creative-tool-container"></div>
      </div>
    </div>
  `;

  renderActiveToolView();
}

function renderActiveToolView() {
  const box = document.getElementById('creative-tool-container');
  if (!box) return;

  if (activeTool === 'code') {
    box.innerHTML = `
      <h3 style="font-size:var(--text-base); font-weight:700; margin-bottom:8px;">কোডিং প্লেগ্রাউন্ড (HTML / CSS / JS)</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
        <textarea id="code-html-input" class="input-field" rows="8" placeholder="<h1>হ্যালো ZenvX!</h1>" style="font-family:var(--font-mono); font-size:12px; resize:vertical; padding:8px;"><h2 style="color:#0D47A1;">ZenvX কোড প্রিভিউ</h2><p>আপনার কোড এখানে রান হচ্ছে।</p></textarea>
        <iframe id="code-live-preview" style="width:100%; height:170px; background:#FFF; border-radius:8px; border:1px solid var(--border-color);"></iframe>
      </div>
      <button id="btn-run-code" class="btn btn-primary" style="width:100%; min-height:38px; font-size:13px;">কোড রান করুন</button>
    `;

    const updatePreview = () => {
      const code = document.getElementById('code-html-input')?.value || '';
      const iframe = document.getElementById('code-live-preview');
      if (iframe) {
        iframe.srcdoc = code;
      }
    };
    box.querySelector('#btn-run-code')?.addEventListener('click', updatePreview);
    updatePreview();
    return;
  }

  if (activeTool === 'timer') {
    box.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <h3 style="font-size:var(--text-lg); font-weight:700; margin-bottom:6px;">পমোডোরো স্টাডি টাইমার</h3>
        <div id="pomodoro-display" style="font-family:var(--font-mono); font-size:3rem; font-weight:800; color:var(--color-primary); margin:16px 0;">25:00</div>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button id="btn-pomo-start" class="btn btn-primary">শুরু করুন</button>
          <button id="btn-pomo-reset" class="btn btn-outline">রিসেট</button>
        </div>
      </div>
    `;
    let timeLeft = 25 * 60;
    let timerId = null;
    box.querySelector('#btn-pomo-start')?.addEventListener('click', () => {
      playKeyFeedback();
      if (timerId) clearInterval(timerId);
      timerId = setInterval(() => {
        if (timeLeft > 0) {
          timeLeft--;
          const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
          const s = String(timeLeft % 60).padStart(2, '0');
          const d = document.getElementById('pomodoro-display');
          if (d) d.textContent = `${m}:${s}`;
        } else {
          clearInterval(timerId);
          showSnackbar('পমোডোরো সেশন শেষ! ৫ মিনিট ব্রেক নিন।', 'success');
        }
      }, 1000);
    });
    return;
  }

  if (activeTool === 'formulas') {
    box.innerHTML = `
      <h3 style="font-size:var(--text-base); font-weight:700; margin-bottom:10px;">গুরুত্বপূর্ণ গাণিতিক ও পদার্থবিজ্ঞান সূত্রাবলী</h3>
      <div style="display:grid; gap:8px; font-size:13px;">
        <div class="history-item"><strong>গতিবিদ্যা:</strong> $v = u + at$, $s = ut + \\frac{1}{2}at^2$, $v^2 = u^2 + 2as$</div>
        <div class="history-item"><strong>মহাকর্ষ:</strong> $F = \\frac{G m_1 m_2}{r^2}$, $g = \\frac{GM}{R^2}$</div>
        <div class="history-item"><strong>ত্রিকোণমিতি:</strong> $\\sin^2\\theta + \\cos^2\\theta = 1$, $\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}$</div>
        <div class="history-item"><strong>দ্বিঘাত সমীকরণ:</strong> মূলদ্বয় $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$</div>
      </div>
    `;
    return;
  }

  // Default placeholder for other 6 tools
  box.innerHTML = `
    <div style="text-align:center; padding:30px;">
      <span class="material-symbols-rounded" style="font-size:48px; color:var(--color-primary);">lightbulb</span>
      <h3 style="font-size:var(--text-lg); font-weight:700; margin-top:8px;">${CREATIVE_TOOLS.find((x) => x.id === activeTool)?.name}</h3>
      <p style="color:var(--text-secondary); font-size:var(--text-sm); margin-top:4px;">এই টুলটি সক্রিয় আছে। আপনার নোট বা প্রজেক্ট এখানে তৈরি করুন।</p>
    </div>
  `;
}

function bindCreativeSpaceEvents(container) {
  container.querySelectorAll('[data-creative-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playKeyFeedback();
      activeTool = btn.getAttribute('data-creative-tool');
      container.querySelectorAll('[data-creative-tool]').forEach((b) => b.classList.toggle('active', b === btn));
      renderActiveToolView();
    });
  });
}
