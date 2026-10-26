/**
 * ZenvX - Calculator
 * File: js/core/state.js
 * Purpose: Reactive global state store (Web equivalent of Riverpod) with automatic
 *          localStorage persistence and subscriber notifications.
 */

const STATE_STORAGE_KEY = 'zenvx_global_state_v1';

const INITIAL_STATE = {
  // Navigation & Onboarding
  currentRoute: 'home', // 'home' | 'chat' | 'create' | 'feed' | 'profile' | 'settings'
  activeHomeTool: 'normal-calc', // 'normal-calc' | 'sci-calc' | 'ai-solver'
  onboardingCompleted: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

  // Appearance & Accessibility
  theme: 'light', // 'light' | 'dark'
  lang: 'bn', // 'bn' | 'en'
  numSystem: 'bn', // 'bn' (১২৩) | 'en' (123)
  numberGrouping: 'lakh', // 'lakh' | 'intl'
  fontSize: 'normal', // 'normal' | 'large' | 'xlarge'
  highContrast: false,

  // Calculator Hardware/Feedback Preferences
  soundEnabled: true,
  vibrationEnabled: true,

  // Scientific Calculator Setup State (fx-991ES PLUS / EX equivalent)
  sciSetup: {
    angleUnit: 'DEG', // 'DEG' | 'RAD' | 'GRA'
    displayMode: 'MATH', // 'MATH' (Natural Display) | 'LINE'
    numberFormat: 'NORM1', // 'NORM1' | 'NORM2' | 'FIX' | 'SCI'
    fixDecimals: 4,
    sciSigFigs: 5,
    fractionFormat: 'IMPROPER', // 'MIXED' (ab/c) | 'IMPROPER' (d/c)
    complexMode: 'RECT', // 'RECT' (a+bi) | 'POLAR' (r∠θ)
    statFreqOn: false,
    activeMode: 'COMP' // COMP, CMPLX, STAT, BASE_N, EQN, MATRIX, VECTOR, TABLE, DIST, INEQ, RATIO, SPREADSHEET
  },

  // AI Solver Quota & Privacy Consent
  aiPrivacyAccepted: false,
  aiDailyUsed: 0,
  aiLastResetDate: new Date().toISOString().slice(0, 10),

  // Authenticated User / Guest Profile
  user: null, // null means Guest Mode
  unreadChatCount: 0
};

class Store {
  constructor() {
    this.listeners = new Set();
    this.state = this.loadPersistedState();
    this.applyThemeAndAccessibility();
  }

  loadPersistedState() {
    try {
      const saved = localStorage.getItem(STATE_STORAGE_KEY);
      if (!saved) return { ...INITIAL_STATE };
      const parsed = JSON.parse(saved);

      // Reset daily AI counter automatically if date changed
      const today = new Date().toISOString().slice(0, 10);
      if (parsed.aiLastResetDate !== today) {
        parsed.aiDailyUsed = 0;
        parsed.aiLastResetDate = today;
      }

      return {
        ...INITIAL_STATE,
        ...parsed,
        sciSetup: {
          ...INITIAL_STATE.sciSetup,
          ...(parsed.sciSetup || {})
        }
      };
    } catch (e) {
      console.warn('[ZenvX Store] Using default state:', e);
      return { ...INITIAL_STATE };
    }
  }

  persistState() {
    try {
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('[ZenvX Store] Could not persist state:', e);
    }
  }

  getState() {
    return this.state;
  }

  /**
   * Update state partially and notify all subscribed UI modules
   */
  setState(updater) {
    const nextPartial = typeof updater === 'function' ? updater(this.state) : updater;
    this.state = {
      ...this.state,
      ...nextPartial
    };
    this.persistState();
    this.applyThemeAndAccessibility();
    this.notify();
  }

  /**
   * Update nested Scientific Calculator setup
   */
  setSciSetup(partialSetup) {
    this.setState((prev) => ({
      sciSetup: {
        ...prev.sciSetup,
        ...partialSetup
      }
    }));
  }

  /**
   * Subscribe to state changes. Returns an unsubscribe function.
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[ZenvX Store] Listener error:', err);
      }
    }
  }

  /**
   * Sync DOM data attributes for theme, font scaling, and contrast
   */
  applyThemeAndAccessibility() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', this.state.theme);
    root.setAttribute('data-font-size', this.state.fontSize);
    root.setAttribute('data-high-contrast', String(Boolean(this.state.highContrast)));

    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.textContent = this.state.theme === 'dark' ? 'light_mode' : 'dark_mode';
    }
  }
}

export const store = new Store();
