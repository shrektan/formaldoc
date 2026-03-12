export {
  convertMarkdownToDocx,
  convertMarkdownToDocxFile,
  ensureDocxExtension,
  getAvailableTemplateSummaries,
  resolveTemplateName,
  toFileUri,
} from './lib/node/docx.js';
export type {
  ConvertMarkdownToDocxBufferResult,
  ConvertMarkdownToDocxOptions,
  ConvertMarkdownToDocxResult,
  TemplateSummary,
} from './lib/node/docx.js';
export { DEFAULT_TEMPLATE, getTemplateNames, isValidTemplateName } from './lib/styles/templates.js';
export type { TemplateName } from './types/styles.js';
