/**
 * ZenvX - Calculator
 * File: js/config/i18n.js
 * Purpose: Bilingual dictionary (Bangla & English), Bangla/English numeral converter,
 *          and Lakh-Crore (১,২৩,৪৫,৬৭৮) vs International (12,345,678) number formatting.
 */

export const STRINGS = {
  bn: {
    app_name: 'ZenvX - Calculator',
    app_tagline: 'সায়েন্টিফিক ক্যালকুলেটর, AI সলভার ও অল-ইন-ওয়ান স্টাডি নেটওয়ার্ক',
    offline_msg: 'আপনি অফলাইনে আছেন। ZenvX ক্যালকুলেটর ও সেভ করা নোট সম্পূর্ণ কাজ করবে।',
    skip: 'এড়িয়ে যান',
    next: 'পরবর্তী',
    start_now: 'শুরু করুন',
    cancel: 'বাতিল',
    save: 'সংরক্ষণ করুন',
    delete: 'মুছে ফেলুন',
    clear_all: 'সব মুছুন',
    copy: 'কপি করুন',
    share: 'শেয়ার করুন',
    copied_msg: 'ক্লিপবোর্ডে কপি করা হয়েছে!',
    close: 'বন্ধ করুন',
    confirm: 'নিশ্চিত করুন',
    loading: 'লোড হচ্ছে...',
    error_generic: 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।',

    // Onboarding
    onb_title_1: 'ZenvX সায়েন্টিফিক ক্যালকুলেটর',
    onb_desc_1: 'নরমাল হিসাব থেকে শুরু করে ম্যাট্রিক্স, ভেক্টর, সমীকরণ, ক্যালকুলাস ও ভগ্নাংশ—সবই চলবে অফলাইনে।',
    onb_title_2: 'AI সলভার ও ব্যক্তিগত টিউটর',
    onb_desc_2: 'অংকের ছবি তুলুন বা মুখে বলুন—ধাপে ধাপে বাংলা ব্যাখ্যাসহ সমাধান পান মুহূর্তেই।',
    onb_title_3: 'স্টাডি গ্রুপ, কল ও নোট শেয়ারিং',
    onb_desc_3: 'বন্ধু ও শিক্ষকদের সাথে চ্যাট, অডিও/ভিডিও স্টাডি রুম, কোডিং এবং এডুকেশন কনটেন্ট থেকে আয়।',

    // Navigation & Hero Tabs
    nav_calc: 'ক্যালকুলেটর',
    nav_chat: 'চ্যাট ও কল',
    nav_create: 'ক্রিয়েট',
    nav_feed: 'ফিড',
    nav_profile: 'প্রোফাইল',

    normal_calc: 'নরমাল ক্যালকুলেটর',
    normal_calc_sub: 'নির্ভুল দশমিক ও লাখ-কোটি হিসাব',
    sci_calc: 'সায়েন্টিফিক ক্যালকুলেটর',
    sci_calc_sub: 'সমীকরণ, ম্যাট্রিক্স, ক্যালকুলাস ও ১২ মোড',
    ai_solver: 'AI সলভার',
    ai_solver_sub: 'ছবি, ভয়েস বা লেখায় ধাপে ধাপে সমাধান',

    // Calculator Strings
    calc_history: 'হিসাবের ইতিহাস',
    calc_no_history: 'এখনো কোনো হিসাব সংরক্ষিত নেই',
    calc_memory: 'মেমরি',
    calc_div_zero: 'শূন্য দিয়ে ভাগ করা অসংজ্ঞায়িত (÷0)',
    calc_syntax_err: 'সিনট্যাক্স ত্রুটি (Syntax ERROR)',
    calc_math_err: 'গাণিতিক ত্রুটি (Math ERROR)',
    calc_stack_err: 'স্ট্যাক অতিক্রম করেছে (Stack ERROR)',
    calc_sound: 'ক্লিক সাউন্ড',
    calc_vibrate: 'ভাইব্রেশন',
    calc_grouping_lakh: 'লাখ-কোটি (১,২৩,৪৫,৬৭৮)',
    calc_grouping_intl: 'আন্তর্জাতিক (12,345,678)',

    // AI Solver
    ai_remaining_limit: 'আজকের বাকি ফ্রি সমাধান:',
    ai_mode_step: 'ধাপে ধাপে',
    ai_mode_short: 'সংক্ষিপ্ত উত্তর',
    ai_mode_easy: 'সহজ করে বোঝাও',
    ai_mode_similar: 'অনুরূপ আরও অংক দাও',
    ai_privacy_notice: 'ফ্রি AI সার্ভিসে পাঠানো ছবি বা লেখা সার্ভিস উন্নয়নে ব্যবহৃত হতে পারে। আপনি কি সম্মত?',
    ai_input_placeholder: 'আপনার প্রশ্ন বা সমীকরণ এখানে লিখুন (যেমন: 2x^2 + 5x - 3 = 0)...',
    ai_solve_btn: 'সমাধান করুন',
    ai_voice_start: 'মুখে বলুন',
    ai_camera_btn: 'ছবি তুলুন / গ্যালারি',

    // Auth & Profile
    auth_guest_banner: 'আপনি অতিথি (Guest) মোডে আছেন। ক্যালকুলেটর ও অফলাইন টুলস সম্পূর্ণ ফ্রি। চ্যাট ও সোশ্যাল ফিচারের জন্য লগইন করুন।',
    auth_login: 'লগইন করুন',
    auth_register: 'নতুন অ্যাকাউন্ট খুলুন',
    auth_google: 'Google দিয়ে প্রবেশ করুন',
    auth_logout: 'সাইন আউট',
    profile_verified_teacher: 'ভেরিফায়েড শিক্ষক',
    profile_apply_teacher: 'ভেরিফায়েড টিচার ব্যাজের আবেদন',
    profile_delete_account: 'অ্যাকাউন্ট ও সব ডেটা ডিলিট করুন'
  },

  en: {
    app_name: 'ZenvX - Calculator',
    app_tagline: 'Scientific Calculator, AI Solver & All-in-One Study Network',
    offline_msg: 'You are offline. ZenvX Calculator and saved notes work fully offline.',
    skip: 'Skip',
    next: 'Next',
    start_now: 'Get Started',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    clear_all: 'Clear All',
    copy: 'Copy',
    share: 'Share',
    copied_msg: 'Copied to clipboard!',
    close: 'Close',
    confirm: 'Confirm',
    loading: 'Loading...',
    error_generic: 'Something went wrong. Please try again.',

    // Onboarding
    onb_title_1: 'ZenvX Scientific Calculator',
    onb_desc_1: 'From everyday arithmetic to Matrix, Vector, Equations, Calculus & Fractions—100% offline.',
    onb_title_2: 'AI Solver & Personal Tutor',
    onb_desc_2: 'Snap a photo or speak your math problem—get step-by-step explanations instantly.',
    onb_title_3: 'Study Groups, Calls & Note Sharing',
    onb_desc_3: 'Chat with classmates and teachers, join audio/video study rooms, code, and earn from posts.',

    // Navigation & Hero Tabs
    nav_calc: 'Calculator',
    nav_chat: 'Chat & Call',
    nav_create: 'Create',
    nav_feed: 'Feed',
    nav_profile: 'Profile',

    normal_calc: 'Normal Calculator',
    normal_calc_sub: 'Exact decimal & Lakh-Crore format',
    sci_calc: 'Scientific Calculator',
    sci_calc_sub: 'Equation, Matrix, Calculus & 12 Modes',
    ai_solver: 'AI Solver',
    ai_solver_sub: 'Photo, Voice or Text step-by-step solver',

    // Calculator Strings
    calc_history: 'Calculation History',
    calc_no_history: 'No calculations saved yet',
    calc_memory: 'Memory',
    calc_div_zero: 'Cannot divide by zero (÷0)',
    calc_syntax_err: 'Syntax ERROR',
    calc_math_err: 'Math ERROR',
    calc_stack_err: 'Stack ERROR',
    calc_sound: 'Key Sound',
    calc_vibrate: 'Haptic Vibration',
    calc_grouping_lakh: 'Lakh-Crore (1,23,45,678)',
    calc_grouping_intl: 'International (12,345,678)',

    // AI Solver
    ai_remaining_limit: 'Daily free AI solves left:',
    ai_mode_step: 'Step-by-Step',
    ai_mode_short: 'Short Answer',
    ai_mode_easy: 'Explain Simply',
    ai_mode_similar: 'Similar Problems',
    ai_privacy_notice: 'Photos/text sent to the free AI service may be used to improve the service. Do you agree?',
    ai_input_placeholder: 'Type your math or science problem here (e.g., 2x^2 + 5x - 3 = 0)...',
    ai_solve_btn: 'Solve Now',
    ai_voice_start: 'Voice Input',
    ai_camera_btn: 'Camera / Gallery',

    // Auth & Profile
    auth_guest_banner: 'You are in Guest Mode. Calculators & offline tools are unlocked. Sign in for Chat & Social features.',
    auth_login: 'Sign In',
    auth_register: 'Create Account',
    auth_google: 'Continue with Google',
    auth_logout: 'Sign Out',
    profile_verified_teacher: 'Verified Teacher',
    profile_apply_teacher: 'Apply for Verified Teacher Badge',
    profile_delete_account: 'Delete Account & All Data'
  }
};

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const EN_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Convert English digits (0-9) in any string/number to Bangla digits (০-৯)
 */
export function toBanglaDigits(input) {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/**
 * Convert Bangla digits (০-৯) in any string to standard English digits (0-9) for evaluation
 */
export function toEnglishDigits(input) {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[০-৯]/g, (d) => EN_DIGITS[BN_DIGITS.indexOf(d)]);
}

/**
 * Format digits according to active numeral preference ('bn' or 'en')
 */
export function formatDigits(input, numSystem = 'bn') {
  const cleanEn = toEnglishDigits(input);
  return numSystem === 'bn' ? toBanglaDigits(cleanEn) : cleanEn;
}

/**
 * Format numeric string with Lakh-Crore (1,23,45,678) or International (12,345,678) commas
 * Preserves exact decimal precision without floating point conversion.
 */
export function formatNumberWithGrouping(numStr, grouping = 'lakh', numSystem = 'bn') {
  if (numStr === null || numStr === undefined || numStr === '') return '';
  const raw = toEnglishDigits(String(numStr).trim());

  // Handle scientific notation or non-numeric messages directly
  if (/[a-zA-Z]/.test(raw) && !raw.startsWith('-')) {
    return formatDigits(raw, numSystem);
  }

  let sign = '';
  let working = raw;
  if (working.startsWith('-') || working.startsWith('−')) {
    sign = '−';
    working = working.slice(1);
  }

  const parts = working.split('.');
  let intPart = parts[0];
  const decPart = parts.length > 1 ? '.' + parts[1] : '';

  if (intPart.length > 3) {
    if (grouping === 'lakh') {
      // Bangladeshi / South Asian Lakh-Crore grouping: last 3 digits, then pairs of 2
      const lastThree = intPart.slice(-3);
      const otherNumbers = intPart.slice(0, -3);
      const formattedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      intPart = formattedOthers + ',' + lastThree;
    } else {
      // International grouping: groups of 3
      intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  }

  const combined = sign + intPart + decPart;
  return formatDigits(combined, numSystem);
}

/**
 * Translate a key based on language code ('bn' | 'en')
 */
export function t(key, lang = 'bn') {
  const dict = STRINGS[lang] || STRINGS.bn;
  return dict[key] || STRINGS.bn[key] || key;
}

/**
 * Apply translations to all DOM elements carrying [data-i18n] attribute
 */
export function applyDOMTranslations(lang = 'bn', numSystem = 'bn') {
  document.documentElement.lang = lang;

  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key, lang);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = translated;
    } else {
      el.textContent = translated;
    }
  });

  // Update header toggle labels
  const langLabel = document.getElementById('lang-toggle-label');
  if (langLabel) {
    langLabel.textContent = lang === 'bn' ? 'বাং' : 'EN';
  }

  const numLabel = document.getElementById('num-toggle-label');
  if (numLabel) {
    numLabel.textContent = numSystem === 'bn' ? '১২৩' : '123';
  }
}
