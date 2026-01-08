import { describe, it, expect } from 'bun:test';
import { sanitizeFilename, extractTitle } from './useDocxGenerator';

describe('sanitizeFilename', () => {
  describe('basic functionality', () => {
    it('should return valid filename unchanged', () => {
      expect(sanitizeFilename('My Document')).toBe('My Document');
    });

    it('should preserve Chinese characters', () => {
      expect(sanitizeFilename('中文标题')).toBe('中文标题');
    });

    it('should preserve mixed Chinese and English', () => {
      expect(sanitizeFilename('报告 Report 2024')).toBe('报告 Report 2024');
    });
  });

  describe('invalid characters', () => {
    it('should replace colon with underscore', () => {
      expect(sanitizeFilename('Title: Subtitle')).toBe('Title_ Subtitle');
    });

    it('should replace forward slash with underscore', () => {
      expect(sanitizeFilename('Path/To/File')).toBe('Path_To_File');
    });

    it('should replace backslash with underscore', () => {
      expect(sanitizeFilename('A\\B\\C')).toBe('A_B_C');
    });

    it('should replace multiple invalid characters', () => {
      expect(sanitizeFilename('What? How* Why: "Test"')).toBe('What_ How_ Why_ _Test_');
    });

    it('should replace all invalid chars: / \\ : * ? " < > |', () => {
      expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
    });
  });

  describe('newline handling', () => {
    it('should replace newline with space', () => {
      expect(sanitizeFilename('Line1\nLine2')).toBe('Line1 Line2');
    });

    it('should replace carriage return with space', () => {
      expect(sanitizeFilename('Line1\rLine2')).toBe('Line1 Line2');
    });

    it('should replace CRLF with single space', () => {
      expect(sanitizeFilename('Line1\r\nLine2')).toBe('Line1 Line2');
    });

    it('should collapse multiple newlines into single space', () => {
      expect(sanitizeFilename('Line1\n\n\nLine2')).toBe('Line1 Line2');
    });
  });

  describe('length truncation', () => {
    it('should truncate names longer than 200 chars', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizeFilename(longName);
      expect(result.length).toBe(200);
    });

    it('should not truncate names at 200 chars', () => {
      const exactName = 'b'.repeat(200);
      expect(sanitizeFilename(exactName)).toBe(exactName);
    });

    it('should not truncate names under 200 chars', () => {
      const shortName = 'c'.repeat(100);
      expect(sanitizeFilename(shortName)).toBe(shortName);
    });
  });

  describe('Windows reserved names', () => {
    it('should append _file to CON', () => {
      expect(sanitizeFilename('CON')).toBe('CON_file');
    });

    it('should append _file to con (case insensitive)', () => {
      expect(sanitizeFilename('con')).toBe('con_file');
    });

    it('should append _file to PRN', () => {
      expect(sanitizeFilename('PRN')).toBe('PRN_file');
    });

    it('should append _file to AUX', () => {
      expect(sanitizeFilename('AUX')).toBe('AUX_file');
    });

    it('should append _file to NUL', () => {
      expect(sanitizeFilename('NUL')).toBe('NUL_file');
    });

    it('should append _file to COM1-COM9', () => {
      expect(sanitizeFilename('COM1')).toBe('COM1_file');
      expect(sanitizeFilename('COM9')).toBe('COM9_file');
    });

    it('should append _file to LPT1-LPT9', () => {
      expect(sanitizeFilename('LPT1')).toBe('LPT1_file');
      expect(sanitizeFilename('LPT9')).toBe('LPT9_file');
    });

    it('should not modify names containing reserved words', () => {
      expect(sanitizeFilename('CONTROL')).toBe('CONTROL');
      expect(sanitizeFilename('my CON file')).toBe('my CON file');
    });
  });

  describe('edge cases', () => {
    it('should return "document" for empty string', () => {
      expect(sanitizeFilename('')).toBe('document');
    });

    it('should return "document" for only dots', () => {
      expect(sanitizeFilename('...')).toBe('document');
    });

    it('should return "document" for only spaces', () => {
      expect(sanitizeFilename('   ')).toBe('document');
    });

    it('should remove leading dots', () => {
      expect(sanitizeFilename('...hidden')).toBe('hidden');
    });

    it('should remove trailing dots', () => {
      expect(sanitizeFilename('file...')).toBe('file');
    });

    it('should remove leading and trailing spaces', () => {
      expect(sanitizeFilename('  spaced  ')).toBe('spaced');
    });

    it('should collapse multiple spaces into one', () => {
      expect(sanitizeFilename('too   many   spaces')).toBe('too many spaces');
    });
  });
});

describe('extractTitle', () => {
  describe('heading extraction', () => {
    it('should extract H1 heading', () => {
      expect(extractTitle('# My Title\n\nSome content')).toBe('My Title');
    });

    it('should extract H2 if no H1', () => {
      expect(extractTitle('## Section Title\n\nContent')).toBe('Section Title');
    });

    it('should extract H3 if no H1 or H2', () => {
      expect(extractTitle('### Subsection\n\nContent')).toBe('Subsection');
    });

    it('should prefer H1 over H2', () => {
      expect(extractTitle('## Second\n\n# First')).toBe('First');
    });
  });

  describe('bold/italic extraction', () => {
    it('should extract bold text as title', () => {
      expect(extractTitle('**Bold Title**\n\nContent')).toBe('Bold Title');
    });

    it('should extract italic text as title', () => {
      expect(extractTitle('*Italic Title*\n\nContent')).toBe('Italic Title');
    });
  });

  describe('formatting cleanup', () => {
    it('should remove bold formatting from title', () => {
      expect(extractTitle('# **Bold** Title')).toBe('Bold Title');
    });

    it('should remove inline code from title', () => {
      expect(extractTitle('# Title with `code`')).toBe('Title with code');
    });

    it('should remove link formatting from title', () => {
      expect(extractTitle('# [Link Text](http://example.com)')).toBe('Link Text');
    });
  });

  describe('edge cases', () => {
    it('should return null for empty string', () => {
      expect(extractTitle('')).toBe(null);
    });

    it('should return null for only whitespace', () => {
      expect(extractTitle('   \n\n   ')).toBe(null);
    });

    it('should skip titles that are too long', () => {
      const longTitle = '# ' + 'a'.repeat(100);
      expect(extractTitle(longTitle)).toBe(null);
    });

    it('should skip titles ending with sentence punctuation', () => {
      expect(extractTitle('# This is a sentence.')).toBe(null);
      expect(extractTitle('# Question?')).toBe(null);
    });
  });
});
