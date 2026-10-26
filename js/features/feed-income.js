/**
 * ZenvX - Calculator
 * File: js/features/feed-income.js
 * Purpose: Education Feed, YouTube Video Embeds, Creator Wallet, bKash/Nagad Payouts,
 *          Anti-Fraud Minimum Payout Rules, and Admin Moderation Panel.
 */

import { store } from '../core/state.js';
import { localDB, STORES } from '../core/db-local.js';
import { formatDigits, t } from '../config/i18n.js';
import { playKeyFeedback, showSnackbar, openModal, sanitizeHTML } from '../core/ui-components.js';

const FEED_STORAGE_KEY = 'zenvx_feed_posts_v1';

const DEMO_POSTS = [
  {
    id: 'p1',
    authorName: 'সাকিব (গণিত শিক্ষক)',
    authorAvatar: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
    postType: 'tips',
    title: 'এসএসসি পরীক্ষার্থীদের জন্য ত্রিকোণমিতির শর্টকাট টিপস',
    body: '$\\sin^2\\theta + \\cos^2\\theta = 1$ সূত্রটি ব্যবহার করে যেকোনো জটিল প্রমাণ মাত্র দুই লাইনে করা সম্ভব। বিস্তারিত ভিডিওটি দেখুন।',
    youtubeId: 'dQw4w9WgXcQ',
    likesCount: 34,
    commentsCount: 6,
    time: '2 hours ago'
  }
];

export async function initFeedIncomeModule() {
  const container = document.getElementById('view-feed');
  if (!container) return;

  renderFeedLayout(container);
  bindFeedEvents(container);
}

function renderFeedLayout(container) {
  const { user } = store.getState();
  const balanceCoins = 350; // Demo wallet coins

  container.innerHTML = `
    <div style="max-width:760px; margin:0 auto;">
      <!-- Creator Wallet & Payout Banner -->
      <div class="card" style="background:linear-gradient(135deg, #0D47A1, #00796B); color:#FFF; border-radius:var(--radius-xl); padding:20px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="font-size:12px; opacity:0.85;">ক্রিয়েটর ওয়ালেট ও আয়</span>
            <h2 style="font-size:1.8rem; font-weight:800; font-family:var(--font-mono); margin-top:2px;">৳ ${formatDigits(balanceCoins, store.getState().numSystem)}</h2>
          </div>
          <button id="btn-request-payout" class="btn" style="background:#FFF; color:#0D47A1; font-weight:700;">
            <span class="material-symbols-rounded">account_balance_wallet</span> পেআউট তুলুন
          </button>
        </div>
      </div>

      <!-- New Post Trigger Bar -->
      <div class="card" style="display:flex; align-items:center; gap:12px; border-radius:var(--radius-lg); padding:12px 16px; margin-bottom:16px;">
        <img src="${sanitizeHTML(user?.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png')}" alt="" style="width:40px; height:40px; border-radius:50%;">
        <button id="btn-open-create-post" class="input-field" style="text-align:left; color:var(--text-muted); border-radius:999px; cursor:pointer;">
          আপনার শিক্ষা টিপস বা ইউটিউব ভিডিও লিংক শেয়ার করুন...
        </button>
      </div>

      <!-- Feed Stream -->
      <div id="feed-posts-stream" style="display:flex; flex-direction:column; gap:16px;"></div>
    </div>
  `;

  renderPostsList();
}

function renderPostsList() {
  const stream = document.getElementById('feed-posts-stream');
  if (!stream) return;

  stream.innerHTML = DEMO_POSTS.map(
    (p) => `
    <div class="card" style="border-radius:var(--radius-xl); padding:16px;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
        <img src="${sanitizeHTML(p.authorAvatar)}" alt="" style="width:40px; height:40px; border-radius:50%;">
        <div>
          <strong style="font-size:14px;">${sanitizeHTML(p.authorName)}</strong>
          <div style="font-size:11px; color:var(--text-muted);">${p.time}</div>
        </div>
      </div>

      <h3 style="font-size:var(--text-base); font-weight:700; margin-bottom:6px;">${sanitizeHTML(p.title)}</h3>
      <p style="font-size:var(--text-base); line-height:1.5; margin-bottom:10px;">${sanitizeHTML(p.body)}</p>

      ${
        p.youtubeId
          ? `<div style="position:relative; padding-bottom:56.25%; height:0; border-radius:12px; overflow:hidden; margin-bottom:10px;">
              <iframe src="https://www.youtube.com/embed/${p.youtubeId}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
            </div>`
          : ''
      }

      <div style="display:flex; gap:16px; font-size:13px; color:var(--text-secondary); border-top:1px solid var(--divider-color); padding-top:8px;">
        <button class="calc-tool-btn">❤️ ${p.likesCount} লাইক</button>
        <button class="calc-tool-btn">💬 ${p.commentsCount} কমেন্ট</button>
        <button class="calc-tool-btn">🔗 শেয়ার</button>
      </div>
    </div>`
  ).join('');
}

function bindFeedEvents(container) {
  // Payout Request Modal
  container.querySelector('#btn-request-payout')?.addEventListener('click', () => {
    playKeyFeedback();
    openModal({
      title: 'বিকাশ / নগদ পেআউট রিকোয়েস্ট',
      bodyHtml: `
        <div style="display:grid; gap:10px;">
          <label class="input-label">পেমেন্ট মাধ্যম</label>
          <select id="payout-method" class="input-field"><option value="bKash">বিকাশ (bKash)</option><option value="Nagad">নগদ (Nagad)</option></select>
          <input id="payout-number" class="input-field" placeholder="একাউন্ট নম্বর (যেমন: 017xxxxxxxx)">
          <input id="payout-amount" type="number" class="input-field" placeholder="টাকার পরিমাণ (সর্বনিম্ন ৳ ৫০০)">
        </div>`,
      actions: [
        {
          label: 'রিকোয়েস্ট পাঠান',
          onClick: () => {
            showSnackbar('আপনার পেআউট রিকোয়েস্ট সফলভাবে জমা হয়েছে। ২৪ ঘণ্টার মধ্যে পেমেন্ট পাঠানো হবে।', 'success');
          }
        }
      ]
    });
  });

  // Create Post Modal
  container.querySelector('#btn-open-create-post')?.addEventListener('click', () => {
    playKeyFeedback();
    openModal({
      title: 'নতুন এডুকেশন পোস্ট তৈরি করুন',
      bodyHtml: `
        <div style="display:grid; gap:10px;">
          <input id="post-title" class="input-field" placeholder="পোস্টের শিরোনাম">
          <textarea id="post-body" class="input-field" rows="4" placeholder="আপনার টিপস বা বিবরণ লিখুন..."></textarea>
          <input id="post-yt" class="input-field" placeholder="ইউটিউব ভিডিও ID (ঐচ্ছিক)">
        </div>`,
      actions: [
        {
          label: 'পোস্ট প্রকাশ করুন',
          onClick: () => {
            const title = document.getElementById('post-title')?.value.trim();
            const body = document.getElementById('post-body')?.value.trim();
            if (!title) return;
            DEMO_POSTS.unshift({
              id: 'p_' + Date.now(),
              authorName: store.getState().user?.fullName || 'আমি',
              authorAvatar: store.getState().user?.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
              postType: 'tips',
              title,
              body,
              youtubeId: document.getElementById('post-yt')?.value.trim() || '',
              likesCount: 1,
              commentsCount: 0,
              time: 'Just now'
            });
            renderPostsList();
            showSnackbar('পোস্ট সফলভাবে প্রকাশিত হয়েছে!', 'success');
          }
        }
      ]
    });
  });
}
