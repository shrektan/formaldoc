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

export { renderDocModel } from './lib/docmodel/render.js';
export { parseDocModel, docModelSchema } from './lib/docmodel/types.js';
export type {
  DocModel,
  StyleDef,
  NumberingDef,
  NumberingInstance,
  SectionDef,
  Block,
  ParagraphBlock,
  Run,
  TableBlock,
  Border,
  ImageBlock,
  TocBlock,
  PageBreakBlock,
} from './lib/docmodel/types.js';
