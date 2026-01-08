import { describe, it, expect } from 'bun:test';
import { createDocumentStyles, createFooterFont, getFooterSize, GB_PAGE } from './styles';
import { DEFAULT_STYLES } from '../styles/defaults';
import { getTemplateStyles, getTemplate } from '../styles/templates';

describe('GB_PAGE constants', () => {
  it('should have correct A4 dimensions in twips', () => {
    // A4 is 210mm x 297mm, 1 inch = 1440 twips, 1 inch = 25.4mm
    expect(GB_PAGE.WIDTH).toBe(11906); // ~210mm
    expect(GB_PAGE.HEIGHT).toBe(16838); // ~297mm
  });

  it('should have 1 inch margins', () => {
    // 1 inch = 1440 twips
    expect(GB_PAGE.MARGIN_TOP).toBe(1440);
    expect(GB_PAGE.MARGIN_BOTTOM).toBe(1440);
    expect(GB_PAGE.MARGIN_LEFT).toBe(1440);
    expect(GB_PAGE.MARGIN_RIGHT).toBe(1440);
  });

  it('should have header and footer distances', () => {
    expect(GB_PAGE.HEADER).toBe(851);
    expect(GB_PAGE.FOOTER).toBe(992);
  });
});

describe('createDocumentStyles', () => {
  it('should create styles with default settings', () => {
    const styles = createDocumentStyles(DEFAULT_STYLES);

    expect(styles).toBeDefined();
    expect(styles.paragraphStyles).toBeDefined();
    expect(Array.isArray(styles.paragraphStyles)).toBe(true);
  });

  it('should include all required style IDs', () => {
    const styles = createDocumentStyles(DEFAULT_STYLES);
    const styleIds = styles.paragraphStyles!.map((s) => s.id);

    expect(styleIds).toContain('Normal');
    expect(styleIds).toContain('Title');
    expect(styleIds).toContain('Heading1');
    expect(styleIds).toContain('Heading2');
    expect(styleIds).toContain('Heading3');
    expect(styleIds).toContain('Heading4');
    expect(styleIds).toContain('BodyText');
    expect(styleIds).toContain('ListParagraph');
    expect(styleIds).toContain('TableCaption');
    expect(styleIds).toContain('TableText');
    expect(styleIds).toContain('Formula');
  });

  it('should set Title style to centered', () => {
    const styles = createDocumentStyles(DEFAULT_STYLES);
    const titleStyle = styles.paragraphStyles!.find((s) => s.id === 'Title');

    expect(titleStyle).toBeDefined();
    expect(titleStyle!.paragraph?.alignment).toBe('center');
  });

  it('should set Title font to 宋体 22pt bold', () => {
    const styles = createDocumentStyles(DEFAULT_STYLES);
    const titleStyle = styles.paragraphStyles!.find((s) => s.id === 'Title');

    const font = titleStyle!.run?.font as { eastAsia?: string };
    expect(font?.eastAsia).toBe('宋体');
    expect(titleStyle!.run?.size).toBe(44); // 22pt * 2 = 44 half-points
    expect(titleStyle!.run?.bold).toBe(true);
  });

  it('should set Heading1 font to 黑体 16pt', () => {
    const styles = createDocumentStyles(DEFAULT_STYLES);
    const h1Style = styles.paragraphStyles!.find((s) => s.id === 'Heading1');

    const font = h1Style!.run?.font as { eastAsia?: string };
    expect(font?.eastAsia).toBe('黑体');
    expect(h1Style!.run?.size).toBe(32); // 16pt * 2
  });

  it('should set Heading2 font to 楷体 16pt', () => {
    const styles = createDocumentStyles(DEFAULT_STYLES);
    const h2Style = styles.paragraphStyles!.find((s) => s.id === 'Heading2');

    const font = h2Style!.run?.font as { eastAsia?: string };
    expect(font?.eastAsia).toBe('楷体');
    expect(h2Style!.run?.size).toBe(32);
  });

  it('should set BodyText font to 仿宋 16pt with indent', () => {
    const styles = createDocumentStyles(DEFAULT_STYLES);
    const bodyStyle = styles.paragraphStyles!.find((s) => s.id === 'BodyText');

    const font = bodyStyle!.run?.font as { eastAsia?: string };
    expect(font?.eastAsia).toBe('仿宋');
    expect(bodyStyle!.run?.size).toBe(32);
    expect(bodyStyle!.paragraph?.indent?.firstLine).toBe(640); // 2 chars
  });

  it('should set Formula style to Cambria Math centered', () => {
    const styles = createDocumentStyles(DEFAULT_STYLES);
    const formulaStyle = styles.paragraphStyles!.find((s) => s.id === 'Formula');

    const font = formulaStyle!.run?.font as { ascii?: string };
    expect(font?.ascii).toBe('Cambria Math');
    expect(formulaStyle!.paragraph?.alignment).toBe('center');
  });

  it('should apply custom style settings', () => {
    const customStyles = {
      ...DEFAULT_STYLES,
      title: {
        font: '黑体' as const,
        size: 26,
        bold: false,
        center: true,
      },
    };

    const styles = createDocumentStyles(customStyles);
    const titleStyle = styles.paragraphStyles!.find((s) => s.id === 'Title');

    const font = titleStyle!.run?.font as { eastAsia?: string };
    expect(font?.eastAsia).toBe('黑体');
    expect(titleStyle!.run?.size).toBe(52); // 26pt * 2
    expect(titleStyle!.run?.bold).toBe(false);
  });
});

describe('createFooterFont', () => {
  it('should return font object based on pageFooter settings', () => {
    const font = createFooterFont(DEFAULT_STYLES);

    expect(font.eastAsia).toBe('仿宋');
    // With dual-font support, Chinese fonts use paired English font for ascii
    expect(font.ascii).toBe('Times New Roman');
  });

  it('should use custom footer font', () => {
    const customStyles = {
      ...DEFAULT_STYLES,
      pageFooter: {
        font: '宋体' as const,
        size: 12,
      },
    };

    const font = createFooterFont(customStyles);
    expect(font.eastAsia).toBe('宋体');
    // With dual-font support, 宋体 pairs with Times New Roman
    expect(font.ascii).toBe('Times New Roman');
  });

  it('should use explicit englishFont when provided', () => {
    const customStyles = {
      ...DEFAULT_STYLES,
      pageFooter: {
        font: '仿宋' as const,
        englishFont: 'Arial' as const,
        size: 14,
      },
    };

    const font = createFooterFont(customStyles);
    expect(font.eastAsia).toBe('仿宋');
    expect(font.ascii).toBe('Arial');
  });
});

describe('getFooterSize', () => {
  it('should return footer size in half-points', () => {
    const size = getFooterSize(DEFAULT_STYLES);

    // Default is 14pt, so half-points = 28
    expect(size).toBe(28);
  });

  it('should use custom footer size', () => {
    const customStyles = {
      ...DEFAULT_STYLES,
      pageFooter: {
        font: '仿宋' as const,
        size: 12,
      },
    };

    const size = getFooterSize(customStyles);
    expect(size).toBe(24); // 12pt * 2
  });
});

describe('English font support', () => {
  const enStyles = getTemplateStyles('en-standard');

  it('should create styles with English template settings', () => {
    const styles = createDocumentStyles(enStyles);

    expect(styles).toBeDefined();
    expect(styles.paragraphStyles).toBeDefined();
  });

  it('should set Title font to Arial for English template', () => {
    const styles = createDocumentStyles(enStyles);
    const titleStyle = styles.paragraphStyles!.find((s) => s.id === 'Title');

    const font = titleStyle!.run?.font as { ascii?: string; eastAsia?: string };
    expect(font?.ascii).toBe('Arial');
    // eastAsia should fall back to 宋体 for Chinese character support
    expect(font?.eastAsia).toBe('宋体');
    expect(titleStyle!.run?.size).toBe(40); // 20pt * 2 = 40 half-points
    expect(titleStyle!.run?.bold).toBe(true);
  });

  it('should set BodyText font to Times New Roman for English template', () => {
    const styles = createDocumentStyles(enStyles);
    const bodyStyle = styles.paragraphStyles!.find((s) => s.id === 'BodyText');

    const font = bodyStyle!.run?.font as { ascii?: string; eastAsia?: string };
    expect(font?.ascii).toBe('Times New Roman');
    expect(font?.eastAsia).toBe('宋体');
    expect(bodyStyle!.run?.size).toBe(24); // 12pt * 2
  });

  it('should set Heading1 font to Arial for English template', () => {
    const styles = createDocumentStyles(enStyles);
    const h1Style = styles.paragraphStyles!.find((s) => s.id === 'Heading1');

    const font = h1Style!.run?.font as { ascii?: string; eastAsia?: string };
    expect(font?.ascii).toBe('Arial');
    expect(font?.eastAsia).toBe('宋体');
    expect(h1Style!.run?.size).toBe(32); // 16pt * 2
    expect(h1Style!.run?.bold).toBe(true);
  });

  it('should not have first line indent for English body text', () => {
    const styles = createDocumentStyles(enStyles);
    const bodyStyle = styles.paragraphStyles!.find((s) => s.id === 'BodyText');

    expect(bodyStyle!.paragraph?.indent?.firstLine).toBe(0);
  });

  it('should handle mixed Chinese font in custom styles', () => {
    const mixedStyles = {
      ...enStyles,
      title: {
        font: '宋体' as const,
        size: 22,
        bold: true,
        center: true,
      },
    };

    const styles = createDocumentStyles(mixedStyles);
    const titleStyle = styles.paragraphStyles!.find((s) => s.id === 'Title');

    const font = titleStyle!.run?.font as { ascii?: string; eastAsia?: string };
    // With dual-font support, Chinese font uses paired English font for ascii
    expect(font?.ascii).toBe('Times New Roman');
    expect(font?.eastAsia).toBe('宋体');
  });

  it('should use explicit englishFont when provided', () => {
    const mixedStyles = {
      ...enStyles,
      title: {
        font: '宋体' as const,
        englishFont: 'Arial' as const,
        size: 22,
        bold: true,
        center: true,
      },
    };

    const styles = createDocumentStyles(mixedStyles);
    const titleStyle = styles.paragraphStyles!.find((s) => s.id === 'Title');

    const font = titleStyle!.run?.font as { ascii?: string; eastAsia?: string };
    expect(font?.ascii).toBe('Arial');
    expect(font?.eastAsia).toBe('宋体');
  });
});

describe('Line spacing with documentSettings', () => {
  it('should use exact 28pt spacing for cn-gov template', () => {
    const cnTemplate = getTemplate('cn-gov');
    const styles = createDocumentStyles(cnTemplate.styles, cnTemplate.documentSettings);

    const bodyStyle = styles.paragraphStyles!.find((s) => s.id === 'BodyText');
    expect(bodyStyle!.paragraph?.spacing?.line).toBe(560);
    expect(bodyStyle!.paragraph?.spacing?.lineRule).toBe('exact');
  });

  it('should use 1.5 auto spacing for en-standard template', () => {
    const enTemplate = getTemplate('en-standard');
    const styles = createDocumentStyles(enTemplate.styles, enTemplate.documentSettings);

    const bodyStyle = styles.paragraphStyles!.find((s) => s.id === 'BodyText');
    expect(bodyStyle!.paragraph?.spacing?.line).toBe(360);
    expect(bodyStyle!.paragraph?.spacing?.lineRule).toBe('auto');
  });

  it('should apply line spacing to all paragraph styles', () => {
    const enTemplate = getTemplate('en-standard');
    const styles = createDocumentStyles(enTemplate.styles, enTemplate.documentSettings);

    const stylesToCheck = ['Normal', 'Title', 'Heading1', 'Heading2', 'BodyText', 'ListParagraph'];
    for (const styleId of stylesToCheck) {
      const style = styles.paragraphStyles!.find((s) => s.id === styleId);
      expect(style!.paragraph?.spacing?.line).toBe(360);
      expect(style!.paragraph?.spacing?.lineRule).toBe('auto');
    }
  });

  it('should default to cn-gov spacing when documentSettings is not provided', () => {
    const styles = createDocumentStyles(DEFAULT_STYLES);

    const bodyStyle = styles.paragraphStyles!.find((s) => s.id === 'BodyText');
    expect(bodyStyle!.paragraph?.spacing?.line).toBe(560);
    expect(bodyStyle!.paragraph?.spacing?.lineRule).toBe('exact');
  });
});
