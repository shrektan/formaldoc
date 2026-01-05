import { createContext } from 'react';
import type { StyleKey, StyleSettings, TextStyle, TemplateName, Template } from '../types/styles';

export interface StyleContextValue {
  styles: StyleSettings;
  template: TemplateName;
  currentTemplate: Template;
  updateStyle: (key: StyleKey, style: Partial<TextStyle>) => void;
  setTemplate: (name: TemplateName) => void;
  resetStyles: () => void;
}

export const StyleContext = createContext<StyleContextValue | null>(null);
