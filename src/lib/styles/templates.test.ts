import { describe, it, expect } from 'bun:test';
import {
  TEMPLATES,
  DEFAULT_TEMPLATE,
  getTemplate,
  getTemplateStyles,
  isValidTemplateName,
  getTemplateNames,
} from './templates';
import { CHINESE_FONTS, ENGLISH_FONTS } from '../../types/styles';

describe('Template Registry', () => {
  describe('TEMPLATES', () => {
    it('should contain cn-gov template', () => {
      expect(TEMPLATES['cn-gov']).toBeDefined();
    });

    it('should contain en-standard template', () => {
      expect(TEMPLATES['en-standard']).toBeDefined();
    });

    it('should have exactly 8 templates', () => {
      expect(Object.keys(TEMPLATES)).toHaveLength(8);
    });
  });

  describe('DEFAULT_TEMPLATE', () => {
    it('should be cn-gov', () => {
      expect(DEFAULT_TEMPLATE).toBe('cn-gov');
    });

    it('should be a valid template name', () => {
      expect(isValidTemplateName(DEFAULT_TEMPLATE)).toBe(true);
    });
  });

  describe('getTemplate', () => {
    it('should return cn-gov template', () => {
      const template = getTemplate('cn-gov');
      expect(template.id).toBe('cn-gov');
      expect(template.name).toBe('政府公文');
    });

    it('should return en-standard template', () => {
      const template = getTemplate('en-standard');
      expect(template.id).toBe('en-standard');
      expect(template.name).toBe('Standard');
    });

    it('should return template with all required properties', () => {
      const template = getTemplate('cn-gov');
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('styles');
      expect(template).toHaveProperty('fontSizes');
      expect(template).toHaveProperty('availableFonts');
    });
  });

  describe('getTemplateStyles', () => {
    it('should return StyleSettings for cn-gov', () => {
      const styles = getTemplateStyles('cn-gov');
      expect(styles).toHaveProperty('title');
      expect(styles).toHaveProperty('heading1');
      expect(styles).toHaveProperty('bodyText');
      expect(styles).toHaveProperty('pageFooter');
    });

    it('should return StyleSettings for en-standard', () => {
      const styles = getTemplateStyles('en-standard');
      expect(styles).toHaveProperty('title');
      expect(styles).toHaveProperty('heading1');
      expect(styles).toHaveProperty('bodyText');
      expect(styles).toHaveProperty('pageFooter');
    });
  });

  describe('isValidTemplateName', () => {
    it('should return true for cn-gov', () => {
      expect(isValidTemplateName('cn-gov')).toBe(true);
    });

    it('should return true for en-standard', () => {
      expect(isValidTemplateName('en-standard')).toBe(true);
    });

    it('should return false for invalid names', () => {
      expect(isValidTemplateName('invalid')).toBe(false);
      expect(isValidTemplateName('')).toBe(false);
      expect(isValidTemplateName('CN-GOV')).toBe(false);
    });
  });

  describe('getTemplateNames', () => {
    it('should return all template names', () => {
      const names = getTemplateNames();
      expect(names).toContain('cn-gov');
      expect(names).toContain('cn-general');
      expect(names).toContain('cn-academic');
      expect(names).toContain('cn-report');
      expect(names).toContain('en-standard');
      expect(names).toContain('en-business');
      expect(names).toContain('en-academic');
      expect(names).toContain('en-legal');
      expect(names).toHaveLength(8);
    });
  });

  describe('cn-gov template', () => {
    it('should use Chinese fonts', () => {
      const template = getTemplate('cn-gov');

      // Check that availableFonts contains Chinese fonts
      for (const font of CHINESE_FONTS) {
        expect(template.availableFonts).toContain(font);
      }
    });

    it('should have correct title style', () => {
      const styles = getTemplateStyles('cn-gov');
      expect(styles.title.font).toBe('宋体');
      expect(styles.title.size).toBe(22);
      expect(styles.title.bold).toBe(true);
      expect(styles.title.center).toBe(true);
    });

    it('should have correct body text style', () => {
      const styles = getTemplateStyles('cn-gov');
      expect(styles.bodyText.font).toBe('仿宋');
      expect(styles.bodyText.size).toBe(16);
      expect(styles.bodyText.indent).toBe(true);
    });

    it('should use Chinese font sizes', () => {
      const template = getTemplate('cn-gov');
      expect(template.fontSizes.some((s) => s.name === '三号')).toBe(true);
      expect(template.fontSizes.some((s) => s.name === '四号')).toBe(true);
    });
  });

  describe('en-standard template', () => {
    it('should use English fonts', () => {
      const template = getTemplate('en-standard');

      // Check that availableFonts contains English fonts
      for (const font of ENGLISH_FONTS) {
        expect(template.availableFonts).toContain(font);
      }
    });

    it('should have correct title style with Arial', () => {
      const styles = getTemplateStyles('en-standard');
      expect(styles.title.font).toBe('Arial');
      expect(styles.title.size).toBe(20);
      expect(styles.title.bold).toBe(true);
      expect(styles.title.center).toBe(true);
    });

    it('should have correct body text style with Times New Roman', () => {
      const styles = getTemplateStyles('en-standard');
      expect(styles.bodyText.font).toBe('Times New Roman');
      expect(styles.bodyText.size).toBe(12);
      expect(styles.bodyText.indent).toBe(false);
    });

    it('should have headings with Arial font', () => {
      const styles = getTemplateStyles('en-standard');
      expect(styles.heading1.font).toBe('Arial');
      expect(styles.heading2.font).toBe('Arial');
      expect(styles.heading3.font).toBe('Arial');
      expect(styles.heading4.font).toBe('Arial');
    });

    it('should use English font sizes (pt notation)', () => {
      const template = getTemplate('en-standard');
      expect(template.fontSizes.some((s) => s.name === '12pt')).toBe(true);
      expect(template.fontSizes.some((s) => s.name === '14pt')).toBe(true);
    });
  });

  describe('Template type safety', () => {
    it('all templates should have matching id property', () => {
      const names = getTemplateNames();
      for (const name of names) {
        const template = getTemplate(name);
        expect(template.id).toBe(name);
      }
    });

    it('all templates should have complete StyleSettings', () => {
      const requiredKeys = [
        'title',
        'heading1',
        'heading2',
        'heading3',
        'heading4',
        'bodyText',
        'listItem',
        'tableHeader',
        'tableCell',
        'pageFooter',
      ];

      const names = getTemplateNames();
      for (const name of names) {
        const styles = getTemplateStyles(name);
        for (const key of requiredKeys) {
          expect(styles).toHaveProperty(key);
          const stylesRecord = styles as unknown as Record<string, unknown>;
          expect(stylesRecord[key]).toHaveProperty('font');
          expect(stylesRecord[key]).toHaveProperty('size');
        }
      }
    });

    it('all templates should have documentSettings', () => {
      const names = getTemplateNames();
      for (const name of names) {
        const template = getTemplate(name);
        expect(template).toHaveProperty('documentSettings');
        expect(template.documentSettings).toHaveProperty('lineSpacing');
        expect(template.documentSettings).toHaveProperty('pageNumberFormat');
        expect(template.documentSettings).toHaveProperty('margins');
      }
    });
  });

  describe('Document settings by template', () => {
    it('cn-gov should use exact 28pt line spacing', () => {
      const template = getTemplate('cn-gov');
      expect(template.documentSettings.lineSpacing.type).toBe('exact');
      expect(template.documentSettings.lineSpacing.value).toBe(560); // 28pt exact
    });

    it('cn-gov should use dash page number format', () => {
      const template = getTemplate('cn-gov');
      expect(template.documentSettings.pageNumberFormat).toBe('dash');
    });

    it('en-standard should use 1.5 auto line spacing', () => {
      const template = getTemplate('en-standard');
      expect(template.documentSettings.lineSpacing.type).toBe('auto');
      expect(template.documentSettings.lineSpacing.value).toBe(360); // 1.5 lines
    });

    it('en-standard should use plain page number format', () => {
      const template = getTemplate('en-standard');
      expect(template.documentSettings.pageNumberFormat).toBe('plain');
    });

    it('en-standard should have different header/footer distances', () => {
      const cnTemplate = getTemplate('cn-gov');
      const enTemplate = getTemplate('en-standard');

      // EN template should have smaller header/footer distances
      expect(enTemplate.documentSettings.margins.header).toBe(720);
      expect(enTemplate.documentSettings.margins.footer).toBe(720);
      expect(cnTemplate.documentSettings.margins.header).toBe(851);
      expect(cnTemplate.documentSettings.margins.footer).toBe(992);
    });
  });
});
