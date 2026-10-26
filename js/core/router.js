/**
 * ZenvX - Calculator
 * File: js/core/router.js
 * Purpose: Main application bootstrap, SPA router (go_router equivalent),
 *          Onboarding flow, Top Bar actions, and dynamic feature module loader.
 */

import { store } from './state.js';
import { applyDOMTranslations, t, formatDigits } from '../config/i18n.js';
import { initFirebaseServices } from '../config/app-config.js';
import { playKeyFeedback } from './ui-components.js';

// Feature module initializers (loaded lazily or safely so Step 1 runs standalone too)
const loadedModules = new Set();

async function ensureModuleLoaded(moduleKey) {
  if (loadedModules.has(moduleKey)) return;

  try {
    if (moduleKey === 'normal-calc') {
      const mod = await import('../features/calc-normal.js');
      if (mod.initNormalCalculator) await mod.initNormalCalculator();
    } else if (moduleKey === 'sci-calc') {
      const mod = await import('../features/calc-scientific.js');
      if (mod.initScientificCalculator) await mod.initScientificCalculator();
    } else if (moduleKey === 'ai-solver') {
      const mod = await import('../features/ai-solver.js');
      if (mod.initAiSolver) await mod.initAiSolver();
    } else if (moduleKey === 'chat') {
      const mod = await import('../features/chat.js');
      if (mod.initChatModule) await mod.initChatModule();
    } else if (moduleKey === 'create') {
      const mod = await import('../features/creative-space.js');
      if (mod.initCreativeSpace) await mod.initCreativeSpace();
    } else if (moduleKey === 'feed') {
      const mod = await import('../features/feed-income.js');
      if (mod.initFeedIncomeModule) await mod.initFeedIncomeModule();
    } else if (moduleKey === 'profile') {
      const mod = await import('../features/auth-profile.js');
      if (mod.initAuthProfileModule) await mod.initAuthProfileModule();
    } else if (moduleKey === 'settings') {
      const mod = await import('../features/settings-security.js');
      if (mod.initSettingsModule) await mod.initSettingsModule();
    }
    loadedModules.add(moduleKey);
  } catch (err) {
    // Graceful placeholder if user is testing Step 1 before later files are created
    console.info(`[ZenvX Router] Module "${moduleKey}" will be activated when its file is added.`, err.message);
  }
}

/**
 * Switch primary route ('home' | 'chat' | 'create' | 'feed' | 'profile' | 'settings')
 */
export async function navigateTo(route) {
  const validRoutes = ['home', 'chat', 'create', 'feed', 'profile', 'settings'];
  const target = validRoutes.includes(route) ? route : 'home';

  store.setState({ currentRoute: target });

  // Hide all main view sections
  document.querySelectorAll('.view-section').forEach((sec) => {
    sec.classList.add('hidden');
  });

  const activeSection = document.getElementById(`view-${target}`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }

  // Update Bottom Nav active indicator
  document.querySelectorAll('#bottom-nav .nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-route') === target);
  });

  // Show back button on settings screen
  const backBtn = document.getElementById('btn-back');
  if (backBtn) {
    backBtn.classList.toggle('hidden', target === 'home');
  }

  // Load corresponding module
  if (target === 'home') {
    await switchHomeTool(store.getState().activeHomeTool);
  } else {
    await ensureModuleLoaded(target);
  }
}

/**
 * Switch between the 3 Hero Cards on Home screen:
 * ('normal-calc' | 'sci-calc' | 'ai-solver')
 */
export async function switchHomeTool(toolKey) {
  store.setState({ activeHomeTool: toolKey });

  document.querySelectorAll('.hero-card').forEach((card) => {
    card.classList.toggle('active-hero', card.getAttribute('data-subview') === toolKey);
  });

  document.querySelectorAll('.home-subview').forEach((sub) => {
    sub.classList.add('hidden');
  });

  const targetContainer = document.getElementById(`subview-${toolKey}`);
  if (targetContainer) {
    targetContainer.classList.remove('hidden');
  }

  await ensureModuleLoaded(toolKey);
}

/**
 * Setup 3-slide Onboarding Carousel for first-time users
 */
function setupOnboarding() {
  let currentSlide = 0;
  const totalSlides = 3;

  const slides = document.querySelectorAll('.onboarding-slide');
  const dots = document.querySelectorAll('#onboarding-dots .dot');
  const nextBtn = document.getElementById('btn-onb-next');
  const skipBtn = document.getElementById('btn-onb-skip');

  function updateCarousel() {
    const { lang } = store.getState();
    slides.forEach((s, idx) => s.classList.toggle('active', idx === currentSlide));
    dots.forEach((d, idx) => d.classList.toggle('active', idx === currentSlide));
    if (nextBtn) {
      nextBtn.textContent = currentSlide === totalSlides - 1 ? t('start_now', lang) : t('next', lang);
    }
  }

  function finishOnboarding() {
    store.setState({ onboardingCompleted: true });
    document.getElementById('view-onboarding')?.classList.add('hidden');
    document.getElementById('app-header')?.classList.remove('hidden');
    document.getElementById('bottom-nav')?.classList.remove('hidden');
    navigateTo('home');
  }

  nextBtn?.addEventListener('click', () => {
    playKeyFeedback();
    if (currentSlide < totalSlides - 1) {
      currentSlide++;
      updateCarousel();
    } else {
      finishOnboarding();
    }
  });

  skipBtn?.addEventListener('click', () => {
    playKeyFeedback();
    finishOnboarding();
  });
}

/**
 * Bind Header controls, Bottom Navigation, Hero Cards, and Network status listeners
 */
function bindGlobalEvents() {
  // Numeral Toggle (১২৩ <-> 123)
  document.getElementById('btn-num-toggle')?.addEventListener('click', () => {
    playKeyFeedback();
    const nextNum = store.getState().numSystem === 'bn' ? 'en' : 'bn';
    store.setState({ numSystem: nextNum });
    applyDOMTranslations(store.getState().lang, nextNum);
  });

  // Language Toggle (bn <-> en)
  document.getElementById('btn-lang-toggle')?.addEventListener('click', () => {
    playKeyFeedback();
    const nextLang = store.getState().lang === 'bn' ? 'en' : 'bn';
    store.setState({ lang: nextLang });
    applyDOMTranslations(nextLang, store.getState().numSystem);
  });

  // Theme Toggle (Light <-> Dark)
  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    playKeyFeedback();
    const nextTheme = store.getState().theme === 'light' ? 'dark' : 'light';
    store.setState({ theme: nextTheme });
  });

  // Settings Shortcut
  document.getElementById('btn-settings-nav')?.addEventListener('click', () => {
    playKeyFeedback();
    navigateTo('settings');
  });

  // Back Button
  document.getElementById('btn-back')?.addEventListener('click', () => {
    playKeyFeedback();
    navigateTo('home');
  });

  // Hero Cards on Home Screen
  document.querySelectorAll('.hero-card').forEach((card) => {
    card.addEventListener('click', () => {
      playKeyFeedback();
      const subview = card.getAttribute('data-subview');
      if (subview) switchHomeTool(subview);
    });
  });

  // Bottom Navigation Tabs
  document.querySelectorAll('#bottom-nav .nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      playKeyFeedback();
      const route = item.getAttribute('data-route');
      if (route) navigateTo(route);
    });
  });

  // Online / Offline Banner Listener
  const updateOnlineBanner = () => {
    const online = navigator.onLine;
    store.setState({ isOnline: online });
    const banner = document.getElementById('offline-banner');
    if (banner) {
      banner.classList.toggle('hidden', online);
    }
  };

  window.addEventListener('online', updateOnlineBanner);
  window.addEventListener('offline', updateOnlineBanner);
  updateOnlineBanner();
}

/**
 * Application Bootstrap
 */
async function bootstrapApp() {
  const state = store.getState();
  applyDOMTranslations(state.lang, state.numSystem);
  bindGlobalEvents();
  setupOnboarding();

  // Initialize Firebase non-blockingly in the background
  initFirebaseServices().catch(() => {});

  // Register Service Worker for offline PWA capability if present
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Transition out of Splash Screen after brief initialization
  setTimeout(() => {
    document.getElementById('view-splash')?.classList.add('hidden');

    if (!store.getState().onboardingCompleted) {
      document.getElementById('view-onboarding')?.classList.remove('hidden');
    } else {
      document.getElementById('app-header')?.classList.remove('hidden');
      document.getElementById('bottom-nav')?.classList.remove('hidden');
      navigateTo(store.getState().currentRoute || 'home');
    }
  }, 650);
}

document.addEventListener('DOMContentLoaded', bootstrapApp);
