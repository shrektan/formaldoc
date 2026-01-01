import type { StyleSettings } from '../../types/styles';
import { DEFAULT_STYLES } from './defaults';

const STORAGE_KEY = 'formaldoc-styles';

/**
 * Load style settings from localStorage
 * Falls back to defaults if not found or invalid
 */
export function loadStyles(): StyleSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StyleSettings;
      // Merge with defaults to handle any missing keys from older versions
      return { ...DEFAULT_STYLES, ...parsed };
    }
  } catch {
    // Invalid JSON, return defaults
  }
  return DEFAULT_STYLES;
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
