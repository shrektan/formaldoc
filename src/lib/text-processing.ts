/**
 * Text processing utilities for cleaning AI-generated content.
 */

export interface ProcessingResult {
  text: string;
  count: number;
}

export interface CleanAllResult {
  text: string;
  quotes: number;
  emphasis: number;
  spaces: number;
}

/**
 * Convert English double quotes to Chinese double quotes.
 * "content" -> "content" (U+201C and U+201D)
 */
export function convertQuotes(text: string): ProcessingResult {
  let count = 0;
  const converted = text.replace(/"([^"]*)"/g, (_match, content) => {
    count++;
    return '\u201C' + content + '\u201D';
  });
  return { text: converted, count };
}

/**
 * Remove Markdown bold (**) and italic (*) markers while preserving content.
 * Protects math formulas ($...$) from modification.
 */
export function removeMarkdownEmphasis(text: string): ProcessingResult {
  // Split text to protect math formulas
  const mathPattern = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g;
  const parts = text.split(mathPattern);

  let count = 0;

  const processed = parts
    .map((part, index) => {
      // Odd indices are math blocks, preserve them
      if (index % 2 === 1) return part;

      // Process non-math parts
      let result = part;

      // Remove ***bold italic*** first
      result = result.replace(/\*\*\*([^*]+)\*\*\*/g, (_m, content) => {
        count++;
        return content;
      });

      // Remove **bold**
      result = result.replace(/\*\*([^*]+)\*\*/g, (_m, content) => {
        count++;
        return content;
      });

      // Remove *italic* (not adjacent to other asterisks)
      result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_m, content) => {
        count++;
        return content;
      });

      return result;
    })
    .join('');

  return { text: processed, count };
}

/**
 * Remove unnecessary spaces between Chinese characters.
 * Only removes spaces where BOTH sides are Chinese characters or Chinese punctuation.
 * Preserves spaces between Chinese and English/numbers.
 *
 * Examples:
 *   "中 国" -> "中国"  (removed)
 *   "中国 China" -> "中国 China"  (preserved)
 *   "hello world" -> "hello world"  (preserved)
 */
export function removeChineseSpaces(text: string): ProcessingResult {
  let count = 0;

  // Chinese character range: \u4e00-\u9fff (CJK Unified Ideographs)
  // Chinese punctuation: ，。、；：？！""''（）【】《》
  const chineseChar = '[\u4e00-\u9fff]';
  const chinesePunct = '[，。、；：？！""\'\'（）【】《》]';
  // Only match spaces and tabs, NOT newlines (preserve paragraph breaks)
  // Include: full-width space \u3000, non-breaking space \u00A0 (from web copy)
  const spaceOnly = '[ \t\u3000\u00A0]+';

  let result = text;

  // Remove spaces between two Chinese characters
  // Need to loop because matches can overlap (e.g., "中 国 人")
  let prevResult;
  do {
    prevResult = result;
    result = result.replace(
      new RegExp(`(${chineseChar})${spaceOnly}(${chineseChar})`, 'g'),
      (_m, left, right) => {
        count++;
        return left + right;
      }
    );
  } while (result !== prevResult);

  // Remove spaces between Chinese char and Chinese punctuation
  result = result.replace(
    new RegExp(`(${chineseChar})${spaceOnly}(${chinesePunct})`, 'g'),
    (_m, left, right) => {
      count++;
      return left + right;
    }
  );
  result = result.replace(
    new RegExp(`(${chinesePunct})${spaceOnly}(${chineseChar})`, 'g'),
    (_m, left, right) => {
      count++;
      return left + right;
    }
  );

  return { text: result, count };
}

/**
 * Apply all text processing operations in sequence.
 * Order: quotes -> emphasis -> spaces
 */
export function cleanAllAiText(text: string): CleanAllResult {
  const quotesResult = convertQuotes(text);
  const emphasisResult = removeMarkdownEmphasis(quotesResult.text);
  const spacesResult = removeChineseSpaces(emphasisResult.text);

  return {
    text: spacesResult.text,
    quotes: quotesResult.count,
    emphasis: emphasisResult.count,
    spaces: spacesResult.count,
  };
}
