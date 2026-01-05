import type { StyleSettings, TemplateName } from '../../types/styles';
import { getTemplateStyles, isValidTemplateName, DEFAULT_TEMPLATE } from './templates';

const STORAGE_KEY = 'formaldoc-styles';
const TEMPLATE_KEY = 'formaldoc-template';

/**
 * Load template name from localStorage
 * Falls back to DEFAULT_TEMPLATE if not found or invalid
 */
export function loadTemplate(): TemplateName {
  try {
    const stored = localStorage.getItem(TEMPLATE_KEY);
    if (stored && isValidTemplateName(stored)) {
      return stored;
    }
  } catch {
    // localStorage might be disabled
  }
  return DEFAULT_TEMPLATE;
}

/**
 * Save template name to localStorage
 */
export function saveTemplate(template: TemplateName): void {
  try {
    localStorage.setItem(TEMPLATE_KEY, template);
  } catch {
    console.warn('Failed to save template to localStorage');
  }
}

/**
 * Clear saved template
 */
export function resetTemplate(): void {
  try {
    localStorage.removeItem(TEMPLATE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Load style settings from localStorage
 * Falls back to template defaults if not found or invalid
 * @param template - Optional template to use for defaults (uses stored template if not provided)
 */
export function loadStyles(template?: TemplateName): StyleSettings {
  const templateDefaults = getTemplateStyles(template ?? loadTemplate());
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
 * Save style settings to localStorage
 */
export function saveStyles(styles: StyleSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(styles));
  } catch {
    // localStorage might be full or disabled
    console.warn('Failed to save styles to localStorage');
  }
}

/**
 * Clear saved styles and reset to defaults
 */
export function resetStyles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}
