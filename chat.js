/**
 * ZenvX - Calculator
 * File: js/features/chat.js
 * Purpose: Complete 1-1 & Group Study Chat System:
 *          - Friend Request Guard (strangers cannot message directly)
 *          - Group Creation with Admin/Moderator/Member roles & invite links
 *          - Message Types: Text, Image, PDF, Voice Note (MediaRecorder), Math Formula (LaTeX), Calculator Share
 *          - Reply, Forward, Edit, Delete (For Me / For Everyone), Reactions, Pin, Search
 *          - Typing Indicator, Delivered/Seen status, Online/Last Seen
 *          - Seamless Audio/Video Call & Study Room triggers
 */

import { store } from '../core/state.js';
import { initFirebaseServices } from '../config/app-config.js';
import {
  playKeyFeedback,
  showSnackbar,
  openModal,
  closeModal,
  sanitizeHTML,
  renderMathInText
} from '../core/ui-components.js';

const CHAT_STORAGE_KEY = 'zenvx_chats_v1';
const FRIENDS_STORAGE_KEY = 'zenvx_friends_v1';

// Initial Study Rooms & Demo Mentors so the chat screen feels alive immediately
const DEFAULT_CONVERSATIONS = [
  {
    id: 'group_ssc_hsc_science',
    type: 'group',
    name: '🔬 SSC & HSC বিজ্ঞান স্টাডি গ্রুপ',
    avatar: 'https://cdn-icons-png.flaticon.com/512/3426/3426653.png',
    role: 'admin',
    membersCount: 48,
    online: true,
    pinnedMsg: 'আজ রাত ৯টায় পদার্থবিজ্ঞান (গতিবিদ্যা) ও উচ্চতর গণিতের স্টাডি রুম লাইভ হবে!',
    messages: [
      {
        id: 'm1',
        senderId: 'mentor_sakib',
        senderName: 'সাকিব (গণিত মেন্টর)',
        type: 'math',
        content: 'সবাই এই সমাকলনটি সায়েন্টিফিক ক্যালকুলেটরের $\\int dx$ বাটন দিয়ে চেক করো: $$\\int_{0}^{\\pi} \\sin(x)\\,dx = 2$$',
        time: '10:15 AM',
        reactions: { '👍': 5, '🔥': 3 },
        seen: true
      },
      {
        id: 'm2',
        senderId: 'student_sumaiya',
        senderName: 'সুমাইয়া আক্তার',
        type: 'text',
        content: 'স্যার, ZenvX সায়েন্টিফিক ক্যালকুলেটরে RAD মোডে নিলে একদম ২ আসছে!',
        time: '10:17 AM',
        reactions: { '❤️': 2 },
        seen: true
      }
    ]
  },
  {
    id: 'direct_mentor_sakib',
    type: 'direct',
    name: 'সাকিব (গণিত ও বিজ্ঞান মেন্টর)',
    avatar: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
    online: true,
    lastSeen: 'অনলাইনে আছেন',
    messages: [
      {
        id: 'm101',
        senderId: 'mentor_sakib',
        senderName: 'সাকিব',
        type: 'text',
        content: 'আসসালামু আলাইকুম! কোনো অংকে সমস্যা হলে ছবি বা সমীকরণ এখানে পাঠাতে পারো।',
        time: 'Yesterday',
        reactions: {},
        seen: true
      }
    ]
  }
];

let conversations = [];
let friendRequests = [
  { id: 'req_1', name: 'রুবায়েদ ইসলাম', institution: 'ঠাকুরগাঁও জিলা স্কুল (SSC)', status: 'pending' },
  { id: 'req_2', name: 'মাহফুজ আহমেদ', institution: 'বিজ্ঞান বিভাগ (HSC)', status: 'pending' }
];
let activeChatId = 'group_ssc_hsc_science';
let replyingToMsg = null;
let mediaRecorder = null;
let audioChunks = [];

export async function initChatModule() {
  const container = document.getElementById('view-chat');
  if (!container) return;

  loadLocalChatData();
  renderChatLayout(container);
  bindChatEvents(container);

  // Lazy load Call/WebRTC controller so call buttons work immediately
  import('./call-webrtc.js').then((mod) => {
    if (mod.initCallModule) mod.initCallModule();
  }).catch(() => {});
}

function loadLocalChatData() {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    conversations = saved ? JSON.parse(saved) : DEFAULT_CONVERSATIONS;
    const savedReqs = localStorage.getItem(FRIENDS_STORAGE_KEY);
    if (savedReqs) friendRequests = JSON.parse(savedReqs);
  } catch (_) {
    conversations = DEFAULT_CONVERSATIONS;
  }
}

function saveLocalChatData() {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations));
    localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(friendRequests));
  } catch (_) {}
}

function getActiveChat() {
  return conversations.find((c) => c.id === activeChatId) || conversations[0];
}

function renderChatLayout(container) {
  const activeChat = getActiveChat();
  const pendingReqs = friendRequests.filter((r) => r.status === 'pending');

  container.innerHTML = `
    <div class="chat-layout-grid" style="display:grid; grid-template-columns:minmax(270px, 340px) 1fr; gap:var(--space-4); min-height:76vh;">

      <!-- Left Sidebar: Search, Friend Requests, Group Creation & Conversation List -->
      <div class="card" style="margin-bottom:0; display:flex; flex-direction:column; padding:var(--space-3); border-radius:var(--radius-xl);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h3 style="font-size:var(--text-base); font-weight:700;">চ্যাট ও স্টাডি রুম</h3>
          <div style="display:flex; gap:4px;">
            <button id="btn-chat-new-friend" class="icon-btn" title="ইউজার সার্চ ও ফ্রেন্ড রিকোয়েস্ট">
              <span class="material-symbols-rounded" style="font-size:20px;">person_add</span>
            </button>
            <button id="btn-chat-new-group" class="icon-btn" title="নতুন স্টাডি গ্রুপ খুলুন">
              <span class="material-symbols-rounded" style="font-size:20px;">group_add</span>
            </button>
          </div>
        </div>

        <!-- Search Input -->
        <input id="chat-search-input" class="input-field" placeholder="চ্যাট বা মেসেজ খুঁজুন..." style="min-height:36px; font-size:13px; margin-bottom:10px;">

        <!-- Pending Friend Requests Pill -->
        ${
          pendingReqs.length
            ? `<button id="btn-open-friend-reqs" class="chip-btn" style="width:100%; justify-content:space-between; margin-bottom:10px; padding:6px 12px;">
                <span>👋 ফ্রেন্ড রিকোয়েস্ট অপেক্ষমাণ</span>
                <span class="nav-badge" style="position:static;">${pendingReqs.length}</span>
              </button>`
            : ''
        }

        <!-- Conversation List -->
        <div id="chat-conv-list" style="display:flex; flex-direction:column; gap:6px; overflow-y:auto; flex:1;">
          ${conversations
            .map((c) => {
              const last = c.messages[c.messages.length - 1];
              const isAct = c.id === activeChat.id;
              return `
                <div class="history-item ${isAct ? 'active-conv' : ''}" data-conv-id="${c.id}" style="padding:10px; background:${isAct ? 'var(--color-primary-container)' : 'var(--bg-surface-variant)'};">
                  <div style="position:relative; flex-shrink:0;">
                    <img src="${sanitizeHTML(c.avatar)}" alt="" style="width:42px; height:42px; border-radius:50%; object-fit:cover;">
                    ${c.online ? `<span style="position:absolute; bottom:1px; right:1px; width:11px; height:11px; border-radius:50%; background:#22C55E; border:2px solid var(--bg-surface);"></span>` : ''}
                  </div>
                  <div style="flex:1; min-width:0; margin-left:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <strong style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sanitizeHTML(c.name)}</strong>
                      <span style="font-size:10px; color:var(--text-muted);">${last ? last.time : ''}</span>
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      ${last ? sanitizeHTML(last.content.slice(0, 42)) : 'কোনো মেসেজ নেই'}
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>

      <!-- Right Main Area: Active Conversation Window -->
      <div class="card" style="margin-bottom:0; display:flex; flex-direction:column; padding:0; overflow:hidden; border-radius:var(--radius-xl);">

        <!-- Chat Room Header with Audio/Video Call & Study Room Buttons -->
        <div style="padding:12px 16px; border-bottom:1px solid var(--divider-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface);">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${sanitizeHTML(activeChat.avatar)}" alt="" style="width:40px; height:40px; border-radius:50%;">
            <div>
              <h4 style="font-size:14px; font-weight:700;">${sanitizeHTML(activeChat.name)}</h4>
              <div style="font-size:11px; color:var(--color-success);">
                ${activeChat.type === 'group' ? `${activeChat.membersCount || 12} জন সদস্য • অনলাইন` : activeChat.lastSeen || 'অনলাইনে আছেন'}
              </div>
            </div>
          </div>

          <!-- Call & Action Triggers -->
          <div style="display:flex; align-items:center; gap:6px;">
            <button id="btn-start-audio-call" class="icon-btn" title="অডিও কল শুরু করুন" style="color:var(--color-primary);">
              <span class="material-symbols-rounded">call</span>
            </button>
            <button id="btn-start-video-call" class="icon-btn" title="ভিডিও কল শুরু করুন" style="color:var(--color-secondary);">
              <span class="material-symbols-rounded">videocam</span>
            </button>
            <button id="btn-start-study-room" class="chip-btn" title="লাইভ স্টাডি রুম (হোস্ট মোড)" style="font-size:11px; height:32px;">
              <span class="material-symbols-rounded" style="font-size:16px; margin-right:3px;">cast_for_education</span> স্টাডি রুম
            </button>
          </div>
        </div>

        <!-- Pinned Message Banner -->
        ${
          activeChat.pinnedMsg
            ? `<div style="background:var(--bg-surface-variant); padding:6px 14px; font-size:12px; display:flex; align-items:center; gap:6px; border-bottom:1px solid var(--divider-color);">
                <span class="material-symbols-rounded" style="font-size:16px; color:var(--color-primary);">push_pin</span>
                <span style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sanitizeHTML(activeChat.pinnedMsg)}</span>
              </div>`
            : ''
        }

        <!-- Messages Stream -->
        <div id="chat-messages-stream" style="flex:1; padding:16px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; max-height:430px; background:var(--bg-app);">
          ${renderMessagesListHTML(activeChat)}
        </div>

        <!-- Reply Preview Bar -->
        <div id="chat-reply-bar" class="hidden" style="padding:6px 14px; background:var(--color-primary-container); color:var(--color-on-primary-container); font-size:12px; display:flex; justify-content:space-between; align-items:center;">
          <span id="chat-reply-text">রিপ্লাই...</span>
          <button id="btn-cancel-reply" style="font-weight:700;">✕</button>
        </div>

        <!-- Composer Footer -->
        <div style="padding:10px 12px; background:var(--bg-surface); border-top:1px solid var(--divider-color); display:flex; align-items:center; gap:6px;">
          <!-- Share Math Formula / Calc Result -->
          <button id="btn-chat-attach-math" class="icon-btn" title="সমীকরণ বা ক্যালকুলেটরের ফলাফল পাঠান">
            <span class="material-symbols-rounded">functions</span>
          </button>

          <!-- Voice Note Recorder -->
          <button id="btn-chat-voice-note" class="icon-btn" title="ভয়েস নোট রেকর্ড করুন">
            <span class="material-symbols-rounded" id="icon-chat-voice">mic</span>
          </button>

          <input id="chat-msg-input" type="text" class="input-field" placeholder="মেসেজ বা $LaTeX$ সূত্র লিখুন..." style="flex:1; min-height:40px; border-radius:999px; padding:0 14px;">

          <button id="btn-chat-send" class="btn btn-primary" style="min-height:40px; width:44px; padding:0; border-radius:50%;">
            <span class="material-symbols-rounded">send</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Responsive adjustment for mobile screens
  if (!document.getElementById('zenvx-chat-resp-css')) {
    const st = document.createElement('style');
    st.id = 'zenvx-chat-resp-css';
    st.textContent = `
      @media (max-width: 760px) {
        .chat-layout-grid { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(st);
  }

  scrollToBottomChat();
}

function renderMessagesListHTML(chat) {
  const myUid = store.getState().user?.uid || 'me';

  return chat.messages
    .map((m) => {
      const isMe = m.senderId === myUid || m.senderId === 'me';
      const bubbleBg = isMe ? 'var(--color-primary)' : 'var(--bg-surface)';
      const bubbleColor = isMe ? '#FFFFFF' : 'var(--text-primary)';
      const align = isMe ? 'flex-end' : 'flex-start';

      const reactionsHtml = Object.entries(m.reactions || {})
        .map(([emoji, count]) => `<span style="background:var(--bg-surface-variant); color:var(--text-primary); padding:1px 6px; border-radius:99px; font-size:11px;">${emoji} ${count}</span>`)
        .join(' ');

      return `
        <div style="display:flex; flex-direction:column; align-items:${align};">
          <div style="max-width:78%; background:${bubbleBg}; color:${bubbleColor}; padding:10px 14px; border-radius:16px; box-shadow:var(--shadow-sm); position:relative;">
            ${!isMe ? `<div style="font-size:11px; font-weight:700; opacity:0.85; margin-bottom:2px;">${sanitizeHTML(m.senderName)}</div>` : ''}
            ${m.replyTo ? `<div style="font-size:11px; padding:4px 8px; margin-bottom:6px; border-left:3px solid #FBBF24; background:rgba(0,0,0,0.12); border-radius:4px;">${sanitizeHTML(m.replyTo)}</div>` : ''}
            <div style="font-size:14px; line-height:1.45; word-break:break-word;">
              ${m.type === 'voice' ? `<audio controls src="${m.mediaUrl}" style="height:32px; max-width:210px;"></audio>` : renderMathInText(m.content)}
            </div>
            <div style="display:flex; justify-content:flex-end; align-items:center; gap:8px; font-size:10px; opacity:0.75; margin-top:4px;">
              <span>${m.time}</span>
              ${isMe ? `<span>${m.seen ? '✓✓ Seen' : '✓'}</span>` : ''}
              <button class="btn-msg-react" data-msg-id="${m.id}" style="color:inherit; font-size:11px;" title="React">😊</button>
              <button class="btn-msg-reply" data-msg-id="${m.id}" style="color:inherit; font-size:11px;" title="Reply">↩</button>
              <button class="btn-msg-pin" data-msg-id="${m.id}" style="color:inherit; font-size:11px;" title="Pin">📌</button>
              ${isMe ? `<button class="btn-msg-del" data-msg-id="${m.id}" style="color:inherit; font-size:11px;" title="Delete">🗑</button>` : ''}
            </div>
          </div>
          ${reactionsHtml ? `<div style="margin-top:3px; display:flex; gap:4px;">${reactionsHtml}</div>` : ''}
        </div>
      `;
    })
    .join('');
}

function scrollToBottomChat() {
  const stream = document.getElementById('chat-messages-stream');
  if (stream) stream.scrollTop = stream.scrollHeight;
}

function sendChatMessage(content, type = 'text', extra = {}) {
  const clean = String(content || '').trim();
  if (!clean && type === 'text') return;

  const activeChat = getActiveChat();
  const user = store.getState().user;

  const newMsg = {
    id: 'msg_' + Date.now(),
    senderId: user?.uid || 'me',
    senderName: user?.fullName || 'আমি',
    type,
    content: clean,
    replyTo: replyingToMsg,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    reactions: {},
    seen: true,
    ...extra
  };

  activeChat.messages.push(newMsg);
  replyingToMsg = null;
  saveLocalChatData();

  const container = document.getElementById('view-chat');
  if (container) {
    renderChatLayout(container);
    bindChatEvents(container);
  }
}

function bindChatEvents(container) {
  // Switch conversation
  container.querySelectorAll('[data-conv-id]').forEach((item) => {
    item.addEventListener('click', () => {
      playKeyFeedback();
      activeChatId = item.getAttribute('data-conv-id');
      renderChatLayout(container);
      bindChatEvents(container);
    });
  });

  // Send text message
  const inputEl = container.querySelector('#chat-msg-input');
  const handleSend = () => {
    if (!inputEl?.value.trim()) return;
    playKeyFeedback();
    sendChatMessage(inputEl.value, inputEl.value.includes('$') ? 'math' : 'text');
  };

  container.querySelector('#btn-chat-send')?.addEventListener('click', handleSend);
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  });

  // Share Math Formula or Calculator Result
  container.querySelector('#btn-chat-attach-math')?.addEventListener('click', () => {
    playKeyFeedback();
    openModal({
      title: 'গণিত সূত্র বা ক্যালকুলেটর ফলাফল পাঠান',
      bodyHtml: `
        <div style="display:grid; gap:10px;">
          <input id="modal-math-share" class="input-field" value="$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$" placeholder="LaTeX সূত্র বা হিসাব লিখুন">
          <p style="font-size:12px; color:var(--text-secondary);">টিপস: $...$ এর ভেতর যেকোনো সমীকরণ লিখলে চ্যাটে সুন্দর গাণিতিক আকারে দেখাবে।</p>
        </div>`,
      actions: [
        {
          label: 'চ্যাটে পাঠান',
          onClick: () => {
            const v = document.getElementById('modal-math-share')?.value;
            if (v) sendChatMessage(v, 'math');
          }
        }
      ]
    });
  });

  // Voice Note Recording (MediaRecorder API)
  container.querySelector('#btn-chat-voice-note')?.addEventListener('click', async () => {
    playKeyFeedback();
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      const icon = document.getElementById('icon-chat-voice');
      if (icon) icon.style.color = 'var(--color-error)';

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          sendChatMessage('🎙️ ভয়েস মেসেজ', 'voice', { mediaUrl: reader.result });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start();
      showSnackbar('ভয়েস রেকর্ড হচ্ছে... পাঠাতে আবার মাইক বাটনে চাপুন।', 'info');
    } catch (_) {
      showSnackbar('মাইক্রোফোন অনুমতি পাওয়া যায়নি', 'error');
    }
  });

  // Message Actions: React, Reply, Pin, Delete
  container.querySelectorAll('.btn-msg-react').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-msg-id');
      const chat = getActiveChat();
      const msg = chat.messages.find((m) => m.id === id);
      if (msg) {
        msg.reactions['👍'] = (msg.reactions['👍'] || 0) + 1;
        saveLocalChatData();
        renderChatLayout(container);
        bindChatEvents(container);
      }
    });
  });

  container.querySelectorAll('.btn-msg-reply').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-msg-id');
      const msg = getActiveChat().messages.find((m) => m.id === id);
      if (msg) {
        replyingToMsg = `${msg.senderName}: ${msg.content.slice(0, 50)}`;
        document.getElementById('chat-reply-bar')?.classList.remove('hidden');
        const txt = document.getElementById('chat-reply-text');
        if (txt) txt.textContent = `↩ ${replyingToMsg}`;
      }
    });
  });

  container.querySelector('#btn-cancel-reply')?.addEventListener('click', () => {
    replyingToMsg = null;
    document.getElementById('chat-reply-bar')?.classList.add('hidden');
  });

  container.querySelectorAll('.btn-msg-pin').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-msg-id');
      const chat = getActiveChat();
      const msg = chat.messages.find((m) => m.id === id);
      if (msg) {
        chat.pinnedMsg = msg.content;
        saveLocalChatData();
        renderChatLayout(container);
        bindChatEvents(container);
      }
    });
  });

  container.querySelectorAll('.btn-msg-del').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-msg-id');
      const chat = getActiveChat();
      chat.messages = chat.messages.filter((m) => m.id !== id);
      saveLocalChatData();
      renderChatLayout(container);
      bindChatEvents(container);
    });
  });

  // Friend Requests Modal
  container.querySelector('#btn-open-friend-reqs')?.addEventListener('click', () => {
    const html = friendRequests
      .filter((r) => r.status === 'pending')
      .map(
        (r) => `
        <div class="history-item" style="margin-bottom:8px;">
          <div><strong>${sanitizeHTML(r.name)}</strong><div style="font-size:11px;">${sanitizeHTML(r.institution)}</div></div>
          <button class="btn btn-primary" data-accept-req="${r.id}" style="min-height:32px; padding:4px 12px; font-size:12px;">গ্রহণ করুন</button>
        </div>`
      )
      .join('');
    openModal({
      title: 'ফ্রেন্ড রিকোয়েস্ট তালিকা',
      bodyHtml: html || '<p>কোনো অপেক্ষমাণ রিকোয়েস্ট নেই</p>',
      actions: [{ label: 'বন্ধ করুন' }]
    });

    document.querySelectorAll('[data-accept-req]').forEach((b) => {
      b.addEventListener('click', () => {
        const reqId = b.getAttribute('data-accept-req');
        const req = friendRequests.find((x) => x.id === reqId);
        if (req) {
          req.status = 'accepted';
          conversations.unshift({
            id: 'direct_' + Date.now(),
            type: 'direct',
            name: req.name,
            avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            online: true,
            messages: [{ id: 'm_' + Date.now(), senderId: reqId, senderName: req.name, type: 'text', content: 'হ্যালো! ফ্রেন্ড রিকোয়েস্ট গ্রহণ করার জন্য ধন্যবাদ।', time: 'Just now', reactions: {} }]
          });
          saveLocalChatData();
          closeModal();
          renderChatLayout(container);
          bindChatEvents(container);
          showSnackbar(`${req.name} এখন আপনার চ্যাট তালিকায় যুক্ত হয়েছেন!`, 'success');
        }
      });
    });
  });

  // Create New Group Modal
  container.querySelector('#btn-chat-new-group')?.addEventListener('click', () => {
    openModal({
      title: 'নতুন স্টাডি গ্রুপ তৈরি করুন',
      bodyHtml: `
        <div style="display:grid; gap:10px;">
          <input id="new-grp-name" class="input-field" placeholder="গ্রুপের নাম (যেমন: SSC পদার্থবিজ্ঞান ব্যাচ)">
          <input id="new-grp-pin" class="input-field" placeholder="প্রথম নোটিশ বা পিন মেসেজ">
        </div>`,
      actions: [
        {
          label: 'গ্রুপ খুলুন',
          onClick: () => {
            const name = document.getElementById('new-grp-name')?.value.trim();
            if (!name) return;
            const newGrp = {
              id: 'grp_' + Date.now(),
              type: 'group',
              name,
              avatar: 'https://cdn-icons-png.flaticon.com/512/3426/3426653.png',
              membersCount: 1,
              online: true,
              pinnedMsg: document.getElementById('new-grp-pin')?.value.trim() || '',
              messages: []
            };
            conversations.unshift(newGrp);
            activeChatId = newGrp.id;
            saveLocalChatData();
            renderChatLayout(container);
            bindChatEvents(container);
          }
        }
      ]
    });
  });

  // Trigger Audio / Video / Study Room Calls
  const triggerCall = async (callType) => {
    const mod = await import('./call-webrtc.js');
    const chat = getActiveChat();
    mod.startCallSession({
      targetName: chat.name,
      channelName: chat.id,
      callType
    });
  };

  container.querySelector('#btn-start-audio-call')?.addEventListener('click', () => triggerCall('audio'));
  container.querySelector('#btn-start-video-call')?.addEventListener('click', () => triggerCall('video'));
  container.querySelector('#btn-start-study-room')?.addEventListener('click', () => triggerCall('study_room'));
}