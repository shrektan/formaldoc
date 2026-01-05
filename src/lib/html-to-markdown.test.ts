import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from './html-to-markdown';

describe('htmlToMarkdown', () => {
  describe('headings', () => {
    it('should convert h1 to # heading', () => {
      const html = '<h1>标题</h1>';
      const result = htmlToMarkdown(html);

      expect(result).toBe('# 标题');
    });

    it('should convert h2 to ## heading', () => {
      const html = '<h2>二级标题</h2>';
      const result = htmlToMarkdown(html);

      expect(result).toBe('## 二级标题');
    });

    it('should convert h3 to ### heading', () => {
      const html = '<h3>三级标题</h3>';
      const result = htmlToMarkdown(html);

      expect(result).toBe('### 三级标题');
    });
  });

  describe('paragraphs', () => {
    it('should convert paragraph', () => {
      const html = '<p>这是一段文字。</p>';
      const result = htmlToMarkdown(html);

      expect(result).toBe('这是一段文字。');
    });

    it('should handle multiple paragraphs', () => {
      const html = '<p>第一段</p><p>第二段</p>';
      const result = htmlToMarkdown(html);

      expect(result).toContain('第一段');
      expect(result).toContain('第二段');
    });
  });

  describe('text formatting', () => {
    it('should convert bold text', () => {
      const html = '<p><strong>粗体</strong></p>';
      const result = htmlToMarkdown(html);

      expect(result).toContain('**粗体**');
    });

    it('should convert italic text', () => {
      const html = '<p><em>斜体</em></p>';
      const result = htmlToMarkdown(html);

      // Turndown uses _ for emphasis by default
      expect(result.includes('_斜体_') || result.includes('*斜体*')).toBe(true);
    });

    it('should convert bold and italic combined', () => {
      const html = '<p><strong><em>粗斜体</em></strong></p>';
      const result = htmlToMarkdown(html);

      expect(result).toContain('粗斜体');
    });
  });

  describe('lists', () => {
    it('should convert unordered list', () => {
      const html = '<ul><li>项目一</li><li>项目二</li></ul>';
      const result = htmlToMarkdown(html);

      // Uses - as bullet marker (configured in html-to-markdown.ts)
      expect(result).toContain('项目一');
      expect(result).toContain('项目二');
      expect(result.includes('-') || result.includes('*')).toBe(true);
    });

    it('should convert ordered list', () => {
      const html = '<ol><li>第一</li><li>第二</li></ol>';
      const result = htmlToMarkdown(html);

      expect(result).toContain('第一');
      expect(result).toContain('第二');
      expect(result).toMatch(/\d+\./); // Should have numbered items
    });

    it('should handle nested lists', () => {
      const html = '<ul><li>外层<ul><li>内层</li></ul></li></ul>';
      const result = htmlToMarkdown(html);

      expect(result).toContain('外层');
      expect(result).toContain('内层');
    });
  });

  describe('tables (GFM)', () => {
    it('should convert simple table', () => {
      const html = `
        <table>
          <thead>
            <tr><th>列A</th><th>列B</th></tr>
          </thead>
          <tbody>
            <tr><td>值1</td><td>值2</td></tr>
          </tbody>
        </table>
      `;
      const result = htmlToMarkdown(html);

      expect(result).toContain('|');
      expect(result).toContain('列A');
      expect(result).toContain('列B');
      expect(result).toContain('值1');
      expect(result).toContain('值2');
    });

    it('should include table separator', () => {
      const html = `
        <table>
          <tr><th>A</th><th>B</th></tr>
          <tr><td>1</td><td>2</td></tr>
        </table>
      `;
      const result = htmlToMarkdown(html);

      // Should have separator row with dashes
      expect(result).toContain('---');
    });
  });

  describe('links', () => {
    it('should convert links', () => {
      const html = '<a href="https://example.com">链接文字</a>';
      const result = htmlToMarkdown(html);

      expect(result).toBe('[链接文字](https://example.com)');
    });
  });

  describe('code', () => {
    it('should convert inline code', () => {
      const html = '<code>console.log()</code>';
      const result = htmlToMarkdown(html);

      expect(result).toBe('`console.log()`');
    });

    it('should convert code blocks', () => {
      const html = '<pre><code>function test() {\n  return true;\n}</code></pre>';
      const result = htmlToMarkdown(html);

      // Code blocks may use indentation or fenced format
      expect(result).toContain('function test()');
    });
  });

  describe('mixed content', () => {
    it('should handle complex HTML from AI chatbot', () => {
      const html = `
        <h1>报告标题</h1>
        <h2>一、概述</h2>
        <p>这是<strong>重要</strong>内容。</p>
        <ul>
          <li>要点一</li>
          <li>要点二</li>
        </ul>
        <table>
          <tr><th>项目</th><th>状态</th></tr>
          <tr><td>A</td><td>完成</td></tr>
        </table>
      `;
      const result = htmlToMarkdown(html);

      expect(result).toContain('# 报告标题');
      expect(result).toContain('## 一、概述');
      expect(result).toContain('**重要**');
      expect(result).toContain('要点一');
      expect(result).toContain('|');
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const result = htmlToMarkdown('');

      expect(result).toBe('');
    });

    it('should handle plain text', () => {
      const html = '普通文字';
      const result = htmlToMarkdown(html);

      expect(result).toBe('普通文字');
    });

    it('should handle whitespace', () => {
      const html = '  <p>  文字  </p>  ';
      const result = htmlToMarkdown(html);

      expect(result.trim()).toContain('文字');
    });
  });
});
