/**
 * Preprocessor to fix bold text recognition issues with punctuation
 *
 * Problem: CommonMark's emphasis rules don't recognize **"text"** as bold
 * when ** is immediately followed by punctuation like quotes.
 *
 * Solution: Insert a zero-width space (U+200B) after opening ** when it's
 * followed by certain punctuation characters. This makes the parser
 * correctly recognize the emphasis delimiter.
 *
 * Reference: https://spec.commonmark.org/0.31.2/#emphasis-and-strong-emphasis
 */

// Opening punctuation - can cause issues when appearing after **
// Using Unicode escapes to avoid syntax issues
const OPENING_PUNCTUATION = [
  // ASCII punctuation
  '\u0022', // " - double quote
  '\u0027', // ' - single quote / apostrophe
  '\u0028', // ( - left parenthesis
  '\u005B', // [ - left bracket

  // Chinese/CJK punctuation - opening marks
  '\u201C', // " - left double quotation mark
  '\u2018', // ' - left single quotation mark
  '\uFF08', // （ - fullwidth left parenthesis
  '\u3010', // 【 - left black lenticular bracket
  '\u300A', // 《 - left double angle bracket
  '\u3008', // 〈 - left angle bracket
  '\u300C', // 「 - left corner bracket
  '\u300E', // 『 - left white corner bracket
  '\u3014', // 〔 - left tortoise shell bracket
  '\u3016', // 〖 - left white lenticular bracket
];

// Closing punctuation - can cause issues when appearing before **
const CLOSING_PUNCTUATION = [
  // ASCII punctuation
  '\u0022', // " - double quote
  '\u0027', // ' - single quote / apostrophe
  '\u0029', // ) - right parenthesis
  '\u005D', // ] - right bracket

  // Chinese/CJK punctuation - closing marks
  '\u201D', // " - right double quotation mark
  '\u2019', // ' - right single quotation mark
  '\uFF09', // ） - fullwidth right parenthesis
  '\u3011', // 】 - right black lenticular bracket
  '\u300B', // 》 - right double angle bracket
  '\u3009', // 〉 - right angle bracket
  '\u300D', // 」 - right corner bracket
  '\u300F', // 』 - right white corner bracket
  '\u3015', // 〕 - right tortoise shell bracket
  '\u3017', // 〗 - right white lenticular bracket
];

// Build regex patterns from the punctuation lists
const escapeRegex = (char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const openingPattern = OPENING_PUNCTUATION.map(escapeRegex).join('|');
const closingPattern = CLOSING_PUNCTUATION.map(escapeRegex).join('|');

// Match ** followed by opening punctuation (e.g., **")
const BOLD_OPEN_PATTERN = new RegExp(`\\*\\*(${openingPattern})`, 'g');

// Match closing punctuation followed by ** (e.g., "**)
const BOLD_CLOSE_PATTERN = new RegExp(`(${closingPattern})\\*\\*`, 'g');

/**
 * Preprocess markdown to fix bold text recognition with punctuation
 *
 * @param markdown - The markdown text to preprocess
 * @returns The preprocessed markdown with fixed bold markers
 */
export function preprocessBoldPunctuation(markdown: string): string {
  // Insert zero-width space after ** when followed by opening punctuation
  // **" becomes **\u200B" which is then properly recognized as bold start
  let result = markdown.replace(BOLD_OPEN_PATTERN, '**\u200B$1');

  // Insert zero-width space before ** when preceded by closing punctuation
  // "** becomes "\u200B** which is then properly recognized as bold end
  result = result.replace(BOLD_CLOSE_PATTERN, '$1\u200B**');

  return result;
}
