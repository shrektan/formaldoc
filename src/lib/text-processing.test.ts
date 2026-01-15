import { describe, it, expect } from 'bun:test';
import {
  convertQuotes,
  removeMarkdownEmphasis,
  removeChineseSpaces,
  cleanAllAiText,
} from './text-processing';

describe('convertQuotes', () => {
  it('should convert English double quotes to Chinese', () => {
    const result = convertQuotes('He said "hello"');
    // Chinese left quote \u201C, right quote \u201D
    expect(result.text).toBe('He said \u201Chello\u201D');
    expect(result.count).toBe(1);
  });

  it('should convert multiple quotes', () => {
    const result = convertQuotes('"first" and "second"');
    expect(result.text).toBe('\u201Cfirst\u201D and \u201Csecond\u201D');
    expect(result.count).toBe(2);
  });

  it('should handle empty content between quotes', () => {
    const result = convertQuotes('empty ""');
    expect(result.text).toBe('empty \u201C\u201D');
    expect(result.count).toBe(1);
  });

  it('should return original text when no quotes found', () => {
    const result = convertQuotes('no quotes here');
    expect(result.text).toBe('no quotes here');
    expect(result.count).toBe(0);
  });

  it('should handle Chinese text with quotes', () => {
    const result = convertQuotes('他说"你好"');
    expect(result.text).toBe('他说\u201C你好\u201D');
    expect(result.count).toBe(1);
  });
});

describe('removeMarkdownEmphasis', () => {
  it('should remove bold markers', () => {
    const result = removeMarkdownEmphasis('这是**粗体**文字');
    expect(result.text).toBe('这是粗体文字');
    expect(result.count).toBe(1);
  });

  it('should remove italic markers', () => {
    const result = removeMarkdownEmphasis('这是*斜体*文字');
    expect(result.text).toBe('这是斜体文字');
    expect(result.count).toBe(1);
  });

  it('should remove bold italic markers', () => {
    const result = removeMarkdownEmphasis('这是***粗斜体***文字');
    expect(result.text).toBe('这是粗斜体文字');
    expect(result.count).toBe(1);
  });

  it('should handle multiple markers', () => {
    const result = removeMarkdownEmphasis('**bold** and *italic*');
    expect(result.text).toBe('bold and italic');
    expect(result.count).toBe(2);
  });

  it('should preserve inline math formulas', () => {
    const result = removeMarkdownEmphasis('The formula $a*b$ is preserved');
    expect(result.text).toBe('The formula $a*b$ is preserved');
    expect(result.count).toBe(0);
  });

  it('should preserve block math formulas', () => {
    const result = removeMarkdownEmphasis('Formula: $$a*b**c$$');
    expect(result.text).toBe('Formula: $$a*b**c$$');
    expect(result.count).toBe(0);
  });

  it('should process text around math formulas', () => {
    const result = removeMarkdownEmphasis('**bold** then $a*b$ then **more**');
    expect(result.text).toBe('bold then $a*b$ then more');
    expect(result.count).toBe(2);
  });

  it('should return original text when no markers found', () => {
    const result = removeMarkdownEmphasis('plain text');
    expect(result.text).toBe('plain text');
    expect(result.count).toBe(0);
  });
});

describe('removeChineseSpaces', () => {
  it('should remove spaces between Chinese characters', () => {
    const result = removeChineseSpaces('中 国');
    expect(result.text).toBe('中国');
    expect(result.count).toBe(1);
  });

  it('should remove multiple spaces between Chinese characters', () => {
    const result = removeChineseSpaces('中 国 人 民');
    expect(result.text).toBe('中国人民');
    expect(result.count).toBe(3);
  });

  it('should preserve spaces between Chinese and English', () => {
    const result = removeChineseSpaces('中国 China');
    expect(result.text).toBe('中国 China');
    expect(result.count).toBe(0);
  });

  it('should preserve spaces between English words', () => {
    const result = removeChineseSpaces('hello world');
    expect(result.text).toBe('hello world');
    expect(result.count).toBe(0);
  });

  it('should preserve spaces between Chinese and numbers', () => {
    const result = removeChineseSpaces('中国 2024');
    expect(result.text).toBe('中国 2024');
    expect(result.count).toBe(0);
  });

  it('should remove spaces before Chinese punctuation', () => {
    // Input: 中国 ，很好 (space before Chinese comma)
    const result = removeChineseSpaces('中国 \uff0c很好');
    expect(result.text).toBe('中国\uff0c很好');
    expect(result.count).toBe(1);
  });

  it('should remove spaces after Chinese punctuation', () => {
    // Input: 你好， 世界 (space after Chinese comma)
    const result = removeChineseSpaces('你好\uff0c 世界');
    expect(result.text).toBe('你好\uff0c世界');
    expect(result.count).toBe(1);
  });

  it('should handle mixed content correctly', () => {
    const result = removeChineseSpaces('中 国 China 很 好');
    expect(result.text).toBe('中国 China 很好');
    expect(result.count).toBe(2);
  });

  it('should preserve newlines between paragraphs', () => {
    const result = removeChineseSpaces('第 一 段\n\n第 二 段');
    expect(result.text).toBe('第一段\n\n第二段');
    expect(result.count).toBe(4);
  });

  it('should preserve single newlines', () => {
    const result = removeChineseSpaces('第 一 行\n第 二 行');
    expect(result.text).toBe('第一行\n第二行');
    expect(result.count).toBe(4);
  });

  it('should remove space after Chinese period', () => {
    const result = removeChineseSpaces('同。 今');
    expect(result.text).toBe('同。今');
    expect(result.count).toBe(1);
  });

  it('should remove full-width space', () => {
    // Full-width space \u3000
    const result = removeChineseSpaces('中\u3000国');
    expect(result.text).toBe('中国');
    expect(result.count).toBe(1);
  });

  it('should remove non-breaking space (nbsp)', () => {
    // Non-breaking space \u00A0 (common when copying from web)
    const result = removeChineseSpaces('第三是行稳。\u00A0风控合规');
    expect(result.text).toBe('第三是行稳。风控合规');
    expect(result.count).toBe(1);
  });
});

describe('cleanAllAiText', () => {
  it('should apply all transformations', () => {
    const input = '"Hello" **世 界**';
    const result = cleanAllAiText(input);
    expect(result.text).toBe('\u201CHello\u201D 世界');
    expect(result.quotes).toBe(1);
    expect(result.emphasis).toBe(1);
    expect(result.spaces).toBe(1);
  });

  it('should return zeros when nothing to clean', () => {
    const result = cleanAllAiText('plain text');
    expect(result.text).toBe('plain text');
    expect(result.quotes).toBe(0);
    expect(result.emphasis).toBe(0);
    expect(result.spaces).toBe(0);
  });

  it('should handle complex AI-generated text', () => {
    const input = '他说"你好"\uff0c这是**重 要**的*信 息*';
    const result = cleanAllAiText(input);
    expect(result.text).toBe('他说\u201C你好\u201D\uff0c这是重要的信息');
    expect(result.quotes).toBe(1);
    expect(result.emphasis).toBe(2);
    expect(result.spaces).toBe(2);
  });
});
