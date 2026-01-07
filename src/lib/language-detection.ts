import type { Language } from '../i18n';

const STORAGE_KEY = 'formaldoc-language';

/**
 * Detect language from URL path
 * Returns 'cn' for /cn(/), 'en' for /en(/), null otherwise
 */
function getLanguageFromPath(): Language | null {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/cn') return 'cn';
  if (path === '/en') return 'en';
  return null;
}

/**
 * Detect browser language preference
 * Returns 'cn' for Chinese variants, 'en' for everything else
 */
function detectBrowserLanguage(): Language {
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  if (browserLang.startsWith('zh')) {
    return 'cn';
  }
  return 'en';
}

/**
 * Detect initial language synchronously
 * Priority: URL path > localStorage > browser detection
 * Use this before React renders to determine the initial language
 */
export function detectInitialLanguage(): Language {
  // 1. URL path takes highest priority
  const pathLang = getLanguageFromPath();
  if (pathLang) {
    return pathLang;
  }

  // 2. Then localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'cn' || stored === 'en') {
      return stored;
    }
  } catch {
    // localStorage might be disabled
  }

  // 3. Finally browser detection
  return detectBrowserLanguage();
}
