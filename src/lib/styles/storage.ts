import type { Language } from '../../i18n';
import type { StyleSettings, TemplateName } from '../../types/styles';
import { getTemplateStyles, isValidTemplateName } from './templates';

// Legacy keys (for migration from v1.3.0 and earlier)
const LEGACY_STORAGE_KEY = 'formaldoc-styles';
const LEGACY_TEMPLATE_KEY = 'formaldoc-template';

// Per-language default templates
const DEFAULT_TEMPLATES: Record<Language, TemplateName> = {
  cn: 'cn-gov',
  en: 'en-standard',
};

function getStorageKey(lang: Language): string {
  return `formaldoc-styles-${lang}`;
}

function getTemplateKey(lang: Language): string {
  return `formaldoc-template-${lang}`;
}

/**
 * Migrate legacy settings (pre-v1.4.0) to language-scoped storage
 * Only migrates if new keys don't exist yet
 */
function migrateSettings(lang: Language): void {
  const newTemplateKey = getTemplateKey(lang);

  // Skip if already migrated or has new settings
  try {
    if (localStorage.getItem(newTemplateKey) !== null) {
      return;
    }
  } catch {
    return;
  }

  try {
    const legacyTemplate = localStorage.getItem(LEGACY_TEMPLATE_KEY);
    const legacyStyles = localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!legacyTemplate && !legacyStyles) {
      return; // No legacy settings to migrate
    }

    // Determine which language the legacy settings belong to
    const legacyLang: Language =
      legacyTemplate === 'cn-gov' ? 'cn' : legacyTemplate === 'en-standard' ? 'en' : 'cn';

    // Only migrate to the matching language
    if (lang === legacyLang) {
      if (legacyTemplate) {
        localStorage.setItem(newTemplateKey, legacyTemplate);
      }
      if (legacyStyles) {
        localStorage.setItem(getStorageKey(lang), legacyStyles);
      }
    }
  } catch {
    // Ignore migration errors
  }
}

/**
 * Load template name from localStorage for a specific language
 * Falls back to language-appropriate default template if not found
 */
export function loadTemplate(lang: Language): TemplateName {
  migrateSettings(lang);

  try {
    const stored = localStorage.getItem(getTemplateKey(lang));
    if (stored && isValidTemplateName(stored)) {
      return stored;
    }
  } catch {
    // localStorage might be disabled
  }
  return DEFAULT_TEMPLATES[lang];
}

/**
 * Save template name to localStorage for a specific language
 */
export function saveTemplate(template: TemplateName, lang: Language): void {
  try {
    localStorage.setItem(getTemplateKey(lang), template);
  } catch {
    console.warn('Failed to save template to localStorage');
  }
}

/**
 * Clear saved template for a specific language
 */
export function resetTemplate(lang: Language): void {
  try {
    localStorage.removeItem(getTemplateKey(lang));
  } catch {
    // Ignore errors
  }
}

/**
 * Load style settings from localStorage for a specific language
 * Falls back to template defaults if not found or invalid
 * @param lang - Language to load settings for
 * @param template - Optional template to use for defaults (uses stored template if not provided)
 */
export function loadStyles(lang: Language, template?: TemplateName): StyleSettings {
  const templateDefaults = getTemplateStyles(template ?? loadTemplate(lang));
  try {
    const stored = localStorage.getItem(getStorageKey(lang));
    if (stored) {
      const parsed = JSON.parse(stored) as StyleSettings;
      // Merge with defaults to handle any missing keys from older versions
      return { ...templateDefaults, ...parsed };
    }
  } catch {
    // Invalid JSON, return defaults
  }
  return templateDefaults;
}

/**
 * Save style settings to localStorage for a specific language
 */
export function saveStyles(styles: StyleSettings, lang: Language): void {
  try {
    localStorage.setItem(getStorageKey(lang), JSON.stringify(styles));
  } catch {
    // localStorage might be full or disabled
    console.warn('Failed to save styles to localStorage');
  }
}

/**
 * Clear saved styles for a specific language and reset to defaults
 */
export function resetStyles(lang: Language): void {
  try {
    localStorage.removeItem(getStorageKey(lang));
  } catch {
    // Ignore errors
  }
}
