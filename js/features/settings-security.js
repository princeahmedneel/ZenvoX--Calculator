/**
 * ZenvX - Calculator | File: js/features/settings-security.js
 * Purpose: App Settings, API Key Setup Modal, Privacy Policy, Terms, and Cache Cleaner.
 */
import { store } from '../core/state.js';
import { saveRuntimeConfig, getAppConfig } from '../config/app-config.js';
import { playKeyFeedback, showSnackbar, openModal } from '../core/ui-components.js';

export async function initSettingsModule() {
  const container = document.getElementById('view-settings');
  if (!container) return;

  const cfg = getAppConfig();
  container.innerHTML = `
    <div style="max-width:640px; margin:0 auto;">
      <div class="card">
        <h3 style="font-size:var(--text-lg); font-weight:700; margin-bottom:14px;">ZenvX - Calculator সেটিংস</h3>
        <div style="display:grid; gap:12px;">
          <button id="btn-set-api" class="btn btn-outline" style="justify-content:space-between;">
            <span>🔑 API Keys ও Firebase কনফিগারেশন</span>
            <span class="material-symbols-rounded">chevron_right</span>
          </button>
          <button id="btn-clear-cache" class="btn btn-outline" style="justify-content:space-between; color:var(--color-error);">
            <span>🧹 লোকাল ক্যাশ ও ডেটা পরিষ্কার করুন</span>
            <span class="material-symbols-rounded">delete_sweep</span>
          </button>
          <button id="btn-legal-info" class="btn btn-outline" style="justify-content:space-between;">
            <span>📜 প্রাইভেসি পলিসি ও শর্তাবলী</span>
            <span class="material-symbols-rounded">description</span>
          </button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-set-api')?.addEventListener('click', () => {
    playKeyFeedback();
    openModal({
      title: 'API ও Firebase কনফিগারেশন',
      bodyHtml: `
        <div style="display:grid; gap:10px;">
          <label class="input-label">Gemini API Key</label>
          <input id="cfg-gemini-key" class="input-field" value="${localStorage.getItem('zenvx_gemini_api_key') || ''}" placeholder="AI Studio API Key">
          <label class="input-label">Cloudflare Worker URL</label>
          <input id="cfg-worker-url" class="input-field" value="${cfg.CLOUDFLARE_WORKER_URL || ''}" placeholder="https://your-worker.workers.dev">
        </div>`,
      actions: [
        {
          label: 'সংরক্ষণ করুন',
          onClick: () => {
            const gk = document.getElementById('cfg-gemini-key')?.value.trim();
            const wu = document.getElementById('cfg-worker-url')?.value.trim();
            if (gk) localStorage.setItem('zenvx_gemini_api_key', gk);
            saveRuntimeConfig({ CLOUDFLARE_WORKER_URL: wu });
            showSnackbar('কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে!', 'success');
          }
        }
      ]
    });
  });

  container.querySelector('#btn-clear-cache')?.addEventListener('click', async () => {
    playKeyFeedback();
    localStorage.clear();
    sessionStorage.clear();
    showSnackbar('সকল ক্যাশ ও লোকাল ডেটা মুছে ফেলা হয়েছে।', 'success');
    window.location.reload();
  });
}
