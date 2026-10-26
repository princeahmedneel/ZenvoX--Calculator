/**
 * ZenvX - Calculator
 * File: js/config/app-config.js
 * Purpose: Central configuration, Firebase SDK dynamic loader, AI model constants,
 *          Cloudinary, Agora, and Cloudflare Worker endpoints without hardcoded secrets.
 */

const STORAGE_ENV_KEY = 'zenvx_runtime_env_v1';

/**
 * Default Safe Config Structure.
 * Users or Admins can inject their Firebase/Cloudinary/Agora credentials via Settings -> Developer Config
 * or via window.__ZENVX_ENV__ without modifying source code.
 */
const DEFAULT_ENV = {
  APP_NAME: 'ZenvX - Calculator',
  APP_VERSION: '1.0.0',
  DEFAULT_LANG: 'bn',
  DEFAULT_NUM_SYSTEM: 'bn', // 'bn' (১২৩) | 'en' (123)
  DEFAULT_GROUPING: 'lakh', // 'lakh' (১,২৩,৪৫,৬৭৮) | 'intl' (12,345,678)

  // AI Configuration (Firebase AI Logic / Gemini Developer API Free Tier)
  AI_PRIMARY_MODEL: 'gemini-2.5-flash',
  AI_FALLBACK_MODEL: 'gemini-2.5-flash-lite',
  AI_DAILY_FREE_LIMIT: 15,
  AI_MAX_OUTPUT_TOKENS: 2048,
  AI_IMAGE_MAX_DIMENSION: 1024,
  AI_IMAGE_QUALITY: 0.78,
  AI_SYSTEM_INSTRUCTION:
    'তুমি বাংলাদেশের শিক্ষার্থীদের একজন অভিজ্ঞ শিক্ষক। প্রতিটি প্রশ্নের ধাপে ধাপে সমাধান দাও, প্রতিটি ধাপের কারণ সহজ বাংলায় বলো, প্রয়োজনীয় সূত্র আগে লেখো এবং শেষে চূড়ান্ত উত্তর আলাদা বক্সে দাও। গাণিতিক সমীকরণগুলো স্পষ্ট LaTeX ($...$ বা $$...$$) ফরম্যাটে লেখো। ছবি অস্পষ্ট হলে অনুমান না করে স্পষ্ট ছবি দিতে বলো। বিষয়: গণিত, পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান, ইংরেজি, আইসিটি ও সাধারণ জ্ঞান।',

  // Firebase Web Config (Populated via Settings or window.__ZENVX_ENV__)
  FIREBASE_CONFIG: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: ''
  },

  // Firebase App Check reCAPTCHA v3 Site Key
  APP_CHECK_SITE_KEY: '',

  // Cloudinary Free Unsigned Upload Config
  CLOUDINARY: {
    cloudName: '',
    uploadPreset: ''
  },

  // Agora Free Tier Config (10,000 free mins/month)
  AGORA: {
    appId: '',
    maxGroupCallMembers: 8,
    monthlyFreeMinutesWarning: 9000
  },

  // Cloudflare Worker Free Endpoint (handles FCM Push, Agora Token, and optional AI Proxy)
  CLOUDFLARE_WORKER_URL: ''
};

/**
 * Load runtime configuration merging defaults, localStorage overrides, and window globals.
 */
export function getAppConfig() {
  let savedOverrides = {};
  try {
    const raw = localStorage.getItem(STORAGE_ENV_KEY);
    if (raw) {
      savedOverrides = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[ZenvX Config] Failed to read runtime config from localStorage:', err);
  }

  const windowEnv = (typeof window !== 'undefined' && window.__ZENVX_ENV__) ? window.__ZENVX_ENV__ : {};

  return {
    ...DEFAULT_ENV,
    ...windowEnv,
    ...savedOverrides,
    FIREBASE_CONFIG: {
      ...DEFAULT_ENV.FIREBASE_CONFIG,
      ...(windowEnv.FIREBASE_CONFIG || {}),
      ...(savedOverrides.FIREBASE_CONFIG || {})
    },
    CLOUDINARY: {
      ...DEFAULT_ENV.CLOUDINARY,
      ...(windowEnv.CLOUDINARY || {}),
      ...(savedOverrides.CLOUDINARY || {})
    },
    AGORA: {
      ...DEFAULT_ENV.AGORA,
      ...(windowEnv.AGORA || {}),
      ...(savedOverrides.AGORA || {})
    }
  };
}

/**
 * Save updated environment keys at runtime (from Settings -> API Setup modal)
 */
export function saveRuntimeConfig(partialConfig) {
  const current = getAppConfig();
  const merged = {
    ...current,
    ...partialConfig,
    FIREBASE_CONFIG: {
      ...current.FIREBASE_CONFIG,
      ...(partialConfig.FIREBASE_CONFIG || {})
    },
    CLOUDINARY: {
      ...current.CLOUDINARY,
      ...(partialConfig.CLOUDINARY || {})
    },
    AGORA: {
      ...current.AGORA,
      ...(partialConfig.AGORA || {})
    }
  };
  localStorage.setItem(STORAGE_ENV_KEY, JSON.stringify(merged));
  return merged;
}

/**
 * Check if Firebase is configured with valid project credentials
 */
export function isFirebaseConfigured() {
  const cfg = getAppConfig().FIREBASE_CONFIG;
  return Boolean(cfg && cfg.apiKey && cfg.projectId && cfg.appId);
}

/**
 * Dynamically initialize Firebase (Auth, Firestore, App Check, Analytics) using official modular CDN.
 * Gracefully falls back to offline/guest mode if credentials are not yet entered.
 */
let firebaseInstances = null;

export async function initFirebaseServices() {
  if (firebaseInstances) return firebaseInstances;
  if (!isFirebaseConfigured()) {
    console.info('[ZenvX Firebase] Running in Offline/Local Mode (Firebase keys not set yet).');
    return null;
  }

  try {
    const config = getAppConfig();
    const FB_VERSION = '10.13.1';
    const baseUrl = `https://www.gstatic.com/firebasejs/${FB_VERSION}`;

    const [appMod, authMod, firestoreMod, appCheckMod] = await Promise.all([
      import(`${baseUrl}/firebase-app.js`),
      import(`${baseUrl}/firebase-auth.js`),
      import(`${baseUrl}/firebase-firestore.js`),
      import(`${baseUrl}/firebase-app-check.js`)
    ]);

    const app = appMod.initializeApp(config.FIREBASE_CONFIG);

    // Initialize App Check if site key is provided
    if (config.APP_CHECK_SITE_KEY) {
      try {
        appCheckMod.initializeAppCheck(app, {
          provider: new appCheckMod.ReCaptchaV3Provider(config.APP_CHECK_SITE_KEY),
          isTokenAutoRefreshEnabled: true
        });
      } catch (acErr) {
        console.warn('[ZenvX AppCheck] Initialization warning:', acErr);
      }
    }

    const auth = authMod.getAuth(app);
    const db = firestoreMod.getFirestore(app);

    // Enable Offline Persistence for Firestore to save Spark Plan quota
    try {
      await firestoreMod.enableIndexedDbPersistence(db);
    } catch (persistErr) {
      // Multi-tab or unsupported browser warning is safe to ignore
    }

    firebaseInstances = {
      app,
      auth,
      db,
      authMod,
      firestoreMod
    };

    return firebaseInstances;
  } catch (error) {
    console.error('[ZenvX Firebase] Failed to initialize Firebase SDK:', error);
    return null;
  }
}
