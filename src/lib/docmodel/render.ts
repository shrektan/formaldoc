import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import JSZip from 'jszip';
import {
  Bookmark,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  ImportedXmlComponent,
  InternalHyperlink,
  Packer,
  PageBreak,
  Paragraph,
  ParagraphProperties,
  SimpleField,
  Tab,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { IBorderOptions, ISectionOptions, ParagraphChild } from 'docx';
import { parseDocModel } from './types.js';
import { separateAdjacentTables } from './table-separators.js';
import { latexToOmml } from '../math/latex-to-docx.js';
import { filterModelXmlCharacters, filterXmlCharacters } from './xml-characters.js';
import type {
  Block,
  Border,
  DocModel,
  ImageBlock,
  MathBlock,
  ParagraphBlock,
  Run,
  StyleDef,
  TableBlock,
  TocBlock,
} from './types.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const xml = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!
  );
const twips = (pt: number) => Math.round(pt * 20);
const tag = (name: string, value: string | number) => `<w:${name} w:val="${xml(value)}"/>`;
const fonts = (font: { eastAsia: string; ascii: string }) =>
  `<w:rFonts w:ascii="${xml(font.ascii)}" w:hAnsi="${xml(font.ascii)}" w:eastAsia="${xml(font.eastAsia)}"/>`;

function indentXml(indent: StyleDef['indent'], sizePt: number): string {
  if (!indent) return '';
  // Word prefers character units; LibreOffice needs the equivalent twip values.
  const attrs = Object.entries(indent).flatMap(([key, value]) => [
    `w:${key}="${Math.round(value * 100)}"`,
    `w:${key.replace('Chars', '')}="${twips(value * sizePt)}"`,
  ]);
  return `<w:ind ${attrs.join(' ')}/>`;
}

/** Extend the library's paragraph properties without adding direct formatting. */
class ModelParagraph extends Paragraph {
  constructor(
    style: string,
    children: ParagraphChild[],
    numbering?: { id: number; level: number }
  ) {
    super({ style, children });
    if (numbering) {
      const properties = this.root.find((child) => child instanceof ParagraphProperties);
      const numPr = new ImportedXmlComponent('w:numPr');
      numPr.push(new ImportedXmlComponent('w:ilvl', { 'w:val': numbering.level }));
      numPr.push(new ImportedXmlComponent('w:numId', { 'w:val': numbering.id }));
      properties!.push(numPr);
    }
  }
}

/** Schema order puts pageBreakBefore right after pStyle, ahead of numPr. */
function breakBeforeParagraph(paragraph: Paragraph): void {
  const properties = paragraph['root'].find(
    (child) => child instanceof ParagraphProperties
  ) as ParagraphProperties;
  const children = properties['root'] as unknown[];
  const style = children.findIndex(
    (child) => (child as { rootKey?: string }).rootKey === 'w:pStyle'
  );
  children.splice(style + 1, 0, new ImportedXmlComponent('w:pageBreakBefore'));
}

function fieldRun(name: string, attributes: Record<string, string>, text?: string): TextRun {
  const run = new TextRun({});
  const component = new ImportedXmlComponent(name, attributes);
  if (text !== undefined) component.push(text);
  run.addChildElement(component);
  return run;
}

function tabsXml(style: StyleDef, extra: string): string {
  const tabs = (style.tabs ?? [])
    .map(
      (tab) =>
        `<w:tab w:val="${tab.type}"${tab.leader ? ` w:leader="${tab.leader}"` : ''} w:pos="${twips(tab.posPt)}"/>`
    )
    .join('');
  if (!tabs) return extra;
  return extra ? extra.replace('</w:tabs>', `${tabs}</w:tabs>`) : `<w:tabs>${tabs}</w:tabs>`;
}

function styleXml(style: StyleDef, id: string, name = style.name, extra = ''): string {
  const spacing = style.lineSpacing;
  const pPr = [
    style.keepNext === undefined ? '' : tag('keepNext', Number(style.keepNext)),
    style.pageBreakBefore === undefined
      ? ''
      : tag('pageBreakBefore', Number(style.pageBreakBefore)),
    tag('snapToGrid', Number(style.snapToGrid ?? false)),
    tabsXml(style, extra),
    `<w:spacing w:before="${twips(style.spaceBeforePt ?? 0)}" w:after="${twips(style.spaceAfterPt ?? 0)}" w:line="${spacing.rule === 'multiple' ? Math.round(spacing.value * 240) : twips(spacing.pt)}" w:lineRule="${spacing.rule === 'multiple' ? 'auto' : spacing.rule}"/>`,
    indentXml(style.indent, style.sizePt),
    tag('jc', style.align === 'justify' ? 'both' : style.align),
    style.outlineLevel === undefined ? '' : tag('outlineLvl', style.outlineLevel),
  ].join('');
  if (id === 'FootnoteReference')
    return `<w:style w:type="character" w:styleId="FootnoteReference" w:customStyle="0">${tag('name', 'footnote reference')}<w:rPr>${fonts(style.font)}${tag('vertAlign', 'superscript')}</w:rPr></w:style>`;
  return `<w:style w:type="paragraph" w:styleId="${xml(id)}"${id === 'Normal' ? ' w:default="1"' : ''}${style.builtIn ? ' w:customStyle="0"' : ''}>${tag('name', name)}${style.basedOn ? tag('basedOn', style.basedOn) : ''}${style.next ? tag('next', style.next) : ''}<w:pPr>${pPr}</w:pPr><w:rPr>${fonts(style.font)}${style.bold === undefined ? '' : tag('b', Number(style.bold))}${style.color ? tag('color', style.color) : ''}${tag('sz', Math.round(style.sizePt * 2))}${tag('szCs', Math.round(style.sizePt * 2))}</w:rPr></w:style>`;
}

function numberingXml(model: DocModel): string {
  const sizes = new Map(model.styles.map((style) => [style.id, style.sizePt]));
  const firstLevels = new Map(
    model.numbering.map((def) => [
      def.id,
      def.levels.reduce((first, level) => Math.min(first, level.level), def.levels[0]?.level ?? 0),
    ])
  );
  // Word's chineseCounting uses digit symbols for hundreds (一○○), while
  // chineseCountingThousand preserves regulation wording (一百). Both inputs
  // therefore use the latter native format; no numbering text is materialized.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${W}">${model.numbering
    .map(
      (def, index) =>
        `<w:abstractNum w:abstractNumId="${index}">${tag('multiLevelType', 'multilevel')}${def.levels
          .map(
            (level) =>
              `<w:lvl w:ilvl="${level.level}">${tag('start', level.start)}${level.restartAfterLevel === undefined ? '' : tag('lvlRestart', level.restartAfterLevel + 1)}${tag('numFmt', level.format === 'chineseCounting' ? 'chineseCountingThousand' : level.format)}${level.styleId ? tag('pStyle', level.styleId) : ''}${tag('suff', level.suffix)}${tag('lvlText', level.text)}${tag('lvlJc', 'left')}<w:pPr>${indentXml(level.indent, level.styleId ? sizes.get(level.styleId)! : 0)}</w:pPr><w:rPr>${level.run?.font ? fonts(level.run.font) : ''}${level.run?.bold === undefined ? '' : tag('b', Number(level.run.bold))}</w:rPr></w:lvl>`
          )
          .join('')}</w:abstractNum>`
    )
    .join('')}${model.numberingInstances
    .map(
      (instance, index) =>
        `<w:num w:numId="${index + 1}">${tag(
          'abstractNumId',
          model.numbering.findIndex((def) => def.id === instance.numberingId)
        )}${model.numbering
          .find((definition) => definition.id === instance.numberingId)!
          .levels.map((level) => {
            const start =
              instance.startOverrides?.find((override) => override.level === level.level)?.start ??
              (level.level === firstLevels.get(instance.numberingId)
                ? instance.restartAt
                : undefined) ??
              level.start;
            return `<w:lvlOverride w:ilvl="${level.level}">${tag('startOverride', start)}</w:lvlOverride>`;
          })
          .join('')}</w:num>`
    )
    .join('')}</w:numbering>`;
}

function borderOptions(border?: Border): IBorderOptions {
  return border
    ? { style: border.style ?? 'single', size: border.sizePt * 8, color: border.color ?? '000000' }
    : { style: BorderStyle.NONE, size: 0, color: 'auto' };
}

/** Word identifies built-ins by canonical names; resolve caller aliases consistently. */
function normalizeBuiltInStyles(model: DocModel): DocModel {
  const ids = new Map<string, string>();
  const canonicalId = (style: StyleDef) => {
    if (!style.builtIn) return style.id;
    const name = style.name.toLowerCase();
    if (name === 'normal') return 'Normal';
    if (name === 'title') return 'Title';
    if (name === 'header' || name === '页眉') return 'Header';
    if (name === 'caption' || name === '题注') return 'Caption';
    if (['footnote text', 'footnotetext', '脚注文本', '脚注文字'].includes(name))
      return 'FootnoteText';
    if (['footnote reference', 'footnotereference', '脚注引用'].includes(name))
      return 'FootnoteReference';
    const heading = /^heading ([1-4])$/.exec(name);
    if (heading) return `Heading${heading[1]}`;
    const toc = /^toc ([1-3])$/.exec(name);
    return toc ? `TOC${toc[1]}` : style.id;
  };
  const seen = new Set<string>();
  model.styles.forEach((style, index) => {
    const id = canonicalId(style);
    if (seen.has(id))
      throw new Error(`Invalid DocModel: styles[${index}].id: Duplicate built-in style ${id}`);
    seen.add(id);
    ids.set(style.id, id);
  });
  const resolve = (id: string) => ids.get(id) ?? id;
  for (const style of model.styles) {
    style.id = resolve(style.id);
    if (style.basedOn) style.basedOn = resolve(style.basedOn);
    if (style.next) style.next = resolve(style.next);
  }
  for (const definition of model.numbering) {
    for (const level of definition.levels)
      if (level.styleId) level.styleId = resolve(level.styleId);
  }
  const visit = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.type === 'p') block.styleId = resolve(block.styleId);
      else if (block.type === 'math') {
        if (block.styleId) block.styleId = resolve(block.styleId);
        if (block.paragraphStyleId) block.paragraphStyleId = resolve(block.paragraphStyleId);
      } else if (block.type === 'image' && block.styleId) block.styleId = resolve(block.styleId);
      else if (block.type === 'toc' && block.title)
        block.title.styleId = resolve(block.title.styleId);
      else if (block.type === 'table')
        for (const row of block.rows) for (const cell of row.cells) visit(cell.blocks);
    }
  };
  for (const section of model.sections) {
    const pageNumberStyles = section.pageNumber?.styleIds;
    if (pageNumberStyles) {
      pageNumberStyles.default = resolve(pageNumberStyles.default);
      if (pageNumberStyles.even) pageNumberStyles.even = resolve(pageNumberStyles.even);
    }
    visit(section.blocks);
    visit(section.header ?? []);
    visit(section.headerEven ?? []);
    visit(section.footer ?? []);
  }
  for (const note of model.footnotes ?? []) visit(note.blocks);
  return model;
}

export interface DocModelRenderReport {
  /** Source removals plus any additional removals in serialized XML parts, without double counting. */
  xmlCharactersFiltered: number;
  /** Count each illegal character occurrence in each XML-bound source string field once. */
  sourceXmlCharactersFiltered: number;
  /** Additional final-safety removals by XML/.rels part, after source filtering. */
  xmlPartsCharactersFiltered: Record<string, number>;
  /** Final writer safety changes, with section/table/row and measured page limits. */
  layoutWarnings?: string[];
  /** Declared display/inline totals; failed is the subset rendered from fallback images. */
  mathConversions?: { display: number; inline: number; failed: number; retainedText?: number };
  /** Source crop paths whose failed math conversions retained declared source text. */
  mathTextFallbacks?: string[];
}

/** Compatible Buffer-only API; use renderDocModelWithReport for filtering evidence. */
export async function renderDocModel(input: DocModel): Promise<Buffer> {
  return (await renderDocModelWithReport(input)).buffer;
}

/** Generate independently of Markdown; image bytes are cached per path and never copied for XML filtering. */
export async function renderDocModelWithReport(input: DocModel): Promise<{
  buffer: Buffer;
  report: DocModelRenderReport;
}> {
  const parsed = parseDocModel(input);
  const sourceXmlCharactersFiltered = filterModelXmlCharacters(parsed);
  const report: DocModelRenderReport = {
    xmlCharactersFiltered: sourceXmlCharactersFiltered,
    sourceXmlCharactersFiltered,
    xmlPartsCharactersFiltered: {},
  };
  const model = normalizeBuiltInStyles(parsed);
  const images = new Map<string, Promise<Buffer>>();
  const extraStyles: string[] = [];
  const styles = new Map(model.styles.map((style) => [style.id, style]));
  const base: StyleDef = styles.get('Normal') ?? {
    id: 'Normal',
    name: 'Normal',
    font: { eastAsia: '宋体', ascii: 'Times New Roman' },
    sizePt: 12,
    align: 'left',
    lineSpacing: { rule: 'multiple', value: 1 },
  };
  const footnoteNumbers = new Map(
    (model.footnotes ?? []).map((note, index) => [note.id, index + 1])
  );
  const footnoteMarkers = new Map<number, string>();
  if (footnoteNumbers.size) {
    for (const [id, name] of [
      ['FootnoteText', 'footnote text'],
      ['FootnoteReference', 'footnote reference'],
    ]) {
      if (styles.has(id)) continue;
      const style: StyleDef = {
        ...base,
        id,
        name,
        builtIn: true,
        basedOn: 'Normal',
        next: 'FootnoteText',
        sizePt: 10.5,
        lineSpacing: { rule: 'atLeast', pt: 12.6 },
        indent: { firstLineChars: 0, leftChars: 0, rightChars: 0 },
        spaceBeforePt: 0,
        spaceAfterPt: 0,
        keepNext: false,
        outlineLevel: undefined,
      };
      model.styles.push(style);
      styles.set(id, style);
    }
  }
  const tocWidths = new Map<number, number>();
  const tocStyles = new Map<string, string>();
  let headingIndex = 0;
  let generatedIndex = 0;
  const generatedStyle = (purpose: string, style: StyleDef, extra = '', name?: string) => {
    let id: string;
    do {
      id = `DocModel${purpose}${++generatedIndex}`;
    } while (styles.has(id));
    extraStyles.push(styleXml(style, id, name ?? id, extra));
    return id;
  };
  const imageRun = async (image: ImageBlock) => {
    let data = images.get(image.path);
    if (!data) {
      data = readFile(image.path);
      images.set(image.path, data);
    }
    const floating = image.floating;
    return new ImageRun({
      type: extname(image.path).toLowerCase() === '.png' ? 'png' : 'jpg',
      data: await data,
      transformation: { width: (image.widthPt * 96) / 72, height: (image.heightPt * 96) / 72 },
      floating: floating
        ? {
            horizontalPosition: {
              relative: floating.xRelativeTo,
              offset: Math.round(floating.xPt * 12700),
            },
            verticalPosition: {
              relative: floating.yRelativeTo,
              offset: Math.round(floating.yPt * 12700),
            },
            behindDocument: !floating.inFront,
            allowOverlap: true,
            layoutInCell: false,
          }
        : undefined,
    });
  };
  const textRun = (
    run: Pick<Run, 'text' | 'bold' | 'italic' | 'underline' | 'color' | 'vertAlign'>
  ) =>
    new TextRun({
      text: run.text,
      bold: run.bold,
      italics: run.italic,
      underline:
        run.underline === undefined ? undefined : { type: run.underline ? 'single' : 'none' },
      color: run.color,
      superScript: run.vertAlign === 'superscript' ? true : undefined,
      subScript: run.vertAlign === 'subscript' ? true : undefined,
    });
  const mathChild = async (
    content: NonNullable<Run['math']>,
    display: boolean
  ): Promise<ParagraphChild[]> => {
    report.mathConversions ??= { display: 0, inline: 0, failed: 0 };
    report.mathConversions[display ? 'display' : 'inline']++;
    try {
      if (!content.latex.trim()) throw new Error('Empty formula');
      const omml = latexToOmml(content.latex, display);
      if (!omml.includes('<m:oMath')) throw new Error('Formula conversion produced no native math');
      return [ImportedXmlComponent.fromXmlString(omml) as unknown as ParagraphChild];
    } catch (error) {
      if (content.fallbackText) {
        report.mathConversions.retainedText = (report.mathConversions.retainedText ?? 0) + 1;
        if (content.fallback) (report.mathTextFallbacks ??= []).push(content.fallback.path);
        return content.fallbackText.map(textRun);
      }
      report.mathConversions.failed++;
      if (!content.fallback)
        throw new Error(`Formula conversion failed without fallback image: ${String(error)}`);
      return [await imageRun({ type: 'image', ...content.fallback })];
    }
  };
  const paragraph = async (block: ParagraphBlock, main: boolean) => {
    const children: ParagraphChild[] = [];
    for (const run of block.runs) {
      if (run.math) {
        children.push(...(await mathChild(run.math, false)));
        continue;
      }
      if (run.footnote) {
        const number = footnoteNumbers.get(run.footnote.id)!;
        if (footnoteMarkers.has(number) && footnoteMarkers.get(number) !== run.text)
          throw new Error(`Conflicting markers for footnote ${run.footnote.id}`);
        footnoteMarkers.set(number, run.text);
        const reference = new TextRun({ style: 'FootnoteReference' });
        const component = new ImportedXmlComponent('w:footnoteReference', {
          'w:id': number,
          ...(run.text ? { 'w:customMarkFollows': '1' } : {}),
        });
        reference.addChildElement(component);
        if (run.text) {
          const text = new ImportedXmlComponent('w:t', { 'xml:space': 'preserve' });
          text.push(run.text);
          reference.addChildElement(text);
        }
        children.push(reference);
        continue;
      }
      children.push(textRun(run));
    }
    const heading = main && styles.get(block.styleId)?.outlineLevel !== undefined;
    if (heading) headingIndex++;
    const bookmark = block.bookmark ?? (heading ? `_heading_${headingIndex}` : undefined);
    const textChildren: ParagraphChild[] = bookmark
      ? [new Bookmark({ id: bookmark, children })]
      : children;
    for (const image of block.anchors ?? []) textChildren.push(await imageRun(image));
    const numbering = block.numbering
      ? {
          id:
            model.numberingInstances.findIndex(
              (instance) => instance.id === block.numbering!.instanceId
            ) + 1,
          level: block.numbering.level,
        }
      : undefined;
    return new ModelParagraph(block.styleId, textChildren, numbering);
  };
  let sectionLayout = { sectionIndex: 0, tableIndex: 0, bodyHeightPt: Infinity };
  const warning = (message: string) => (report.layoutWarnings ??= []).push(message);
  const rowMinimumHeight = (row: TableBlock['rows'][number]): number =>
    Math.max(
      row.heightPt ?? 0,
      ...row.cells.map(
        (cell) =>
          cell.blocks.reduce((sum, block) => {
            if (block.type === 'image') return sum + block.heightPt;
            if (block.type === 'math')
              return sum + Math.max(base.sizePt * 1.2, block.fallback?.heightPt ?? 0);
            const style = styles.get(block.styleId) ?? base;
            const spacing = style.lineSpacing;
            const lineHeight =
              spacing.rule === 'multiple'
                ? style.sizePt * spacing.value
                : spacing.rule === 'exact'
                  ? spacing.pt
                  : Math.max(spacing.pt, style.sizePt);
            return sum + lineHeight + (style.spaceBeforePt ?? 0) + (style.spaceAfterPt ?? 0);
          }, 0) / (cell.rowSpan ?? 1)
      )
    );
  // A caller that settled row breaks itself declares them final; otherwise the
  // writer protects repeated headers and over-tall rows from the written heights.
  const rowsFinal = model.settings?.tableRowsFinal === true;
  const table = async (block: TableBlock, main: boolean) => {
    const tableIndex = ++sectionLayout.tableIndex;
    const location = `第${sectionLayout.sectionIndex + 1}节第${tableIndex}个表格`;
    const bodyHeightPt = sectionLayout.bodyHeightPt;
    const heights = rowsFinal ? [] : block.rows.map(rowMinimumHeight);
    const headerHeight = block.rows.reduce(
      (sum, row, index) => sum + (row.header && !rowsFinal ? heights[index] : 0),
      0
    );
    const unsafeHeader = !rowsFinal && headerHeight > bodyHeightPt / 3;
    if (unsafeHeader)
      warning(
        `${location}重复表头高${headerHeight.toFixed(2)}pt，超过正文区${bodyHeightPt.toFixed(2)}pt的1/3，已关闭重复表头。`
      );
    // Resolve skipped cells under vertical merges before handing the grid to docx.
    const active = new Map<
      number,
      {
        remaining: number;
        span: number;
        borders?: TableBlock['rows'][number]['cells'][number]['borders'];
      }
    >();
    const rows: TableRow[] = [];
    for (const [rowIndex, row] of block.rows.entries()) {
      let column = 0;
      let cellIndex = 0;
      const cells: TableCell[] = [];
      while (column < block.columnsPt.length) {
        const continuation = active.get(column);
        const cell = continuation ? undefined : row.cells[cellIndex++];
        const span = continuation?.span ?? cell!.colSpan ?? 1;
        const cellBorders = continuation?.borders ?? cell?.borders;
        const borders = cellBorders
          ? {
              top: borderOptions(cellBorders.top),
              bottom: borderOptions(cellBorders.bottom),
              left: borderOptions(cellBorders.left),
              right: borderOptions(cellBorders.right),
            }
          : undefined;
        const children = cell ? await blocks(cell.blocks, main) : [];
        // An empty Word cell still requires a paragraph. Create it here with a
        // style before docx's TableCell fallback injects an unstyled paragraph.
        if (!children.length) {
          const usedStyles = block.rows.flatMap((row) =>
            row.cells.flatMap((cell) =>
              cell.blocks.flatMap((block) => (block.type === 'p' ? [block.styleId] : []))
            )
          );
          const emptyCellStyle =
            usedStyles.find((id) => /^TableTextP\d+T\d+$/.test(id)) ??
            usedStyles.find((id) => id.startsWith('TableText')) ??
            model.styles.find((style) => style.id.startsWith('TableText'))?.id ??
            'Normal';
          children.push(new ModelParagraph(emptyCellStyle, []));
        }
        cells.push(
          new TableCell({
            children,
            width: {
              type: WidthType.DXA,
              size: twips(block.columnsPt.slice(column, column + span).reduce((a, b) => a + b, 0)),
            },
            columnSpan: span > 1 ? span : undefined,
            verticalMerge: continuation
              ? 'continue'
              : (cell?.rowSpan ?? 1) > 1
                ? 'restart'
                : undefined,
            verticalAlign: cell?.vAlign,
            borders,
          })
        );
        if (continuation) {
          continuation.remaining--;
          if (!continuation.remaining) active.delete(column);
        } else if ((cell!.rowSpan ?? 1) > 1) {
          active.set(column, { remaining: cell!.rowSpan! - 1, span, borders: cellBorders });
        }
        column += span;
      }
      const tooTall = !rowsFinal && heights[rowIndex] > bodyHeightPt;
      if (tooTall)
        warning(
          `${location}第${rowIndex + 1}行高至少${heights[rowIndex].toFixed(2)}pt，超过正文区${bodyHeightPt.toFixed(2)}pt，已允许跨页并保留atLeast行高。`
        );
      rows.push(
        new TableRow({
          children: cells,
          tableHeader: row.header && !unsafeHeader ? true : undefined,
          cantSplit: rowsFinal
            ? row.cantSplit || undefined
            : tooTall
              ? undefined
              : (row.cantSplit ?? true) || undefined,
          height:
            row.heightPt === undefined
              ? undefined
              : { value: twips(row.heightPt), rule: HeightRule.ATLEAST },
        })
      );
    }
    return new Table({
      rows,
      columnWidths: block.columnsPt.map(twips),
      layout: TableLayoutType.FIXED,
      width: { type: WidthType.DXA, size: twips(block.columnsPt.reduce((a, b) => a + b, 0)) },
      alignment: block.align,
      borders: {
        top: borderOptions(block.borders.top),
        bottom: borderOptions(block.borders.bottom),
        left: borderOptions(block.borders.left),
        right: borderOptions(block.borders.right),
        insideHorizontal: borderOptions(block.borders.insideH),
        insideVertical: borderOptions(block.borders.insideV),
      },
    });
  };
  const toc = (block: TocBlock, contentWidth: number) => {
    const result: Paragraph[] = [];
    if (block.title)
      result.push(new ModelParagraph(block.title.styleId, [new TextRun(block.title.text)]));
    const instruction = ` TOC \\o "${block.levels[0]}-${block.levels[1]}" \\h \\z \\u `;
    const begin = () => [
      fieldRun('w:fldChar', { 'w:fldCharType': 'begin' }),
      fieldRun('w:instrText', { 'xml:space': 'preserve' }, instruction),
      fieldRun('w:fldChar', { 'w:fldCharType': 'separate' }),
    ];
    const entries = block.entries.length ? block.entries : [undefined];
    entries.forEach((entry, index) => {
      const children: ParagraphChild[] = index === 0 ? begin() : [];
      const tocId = `TOC${entry?.level ?? 1}`;
      const level = entry?.level ?? 1;
      const key = `${level}:${contentWidth}`;
      let styleId = tocStyles.get(key);
      if (!styleId) {
        if (!tocWidths.has(level)) {
          tocWidths.set(level, contentWidth);
          styleId = tocId;
        } else {
          styleId = generatedStyle(
            'TOC',
            {
              ...(styles.get(tocId) ?? base),
              builtIn: false,
              basedOn: tocId,
            },
            `<w:tabs><w:tab w:val="clear" w:pos="${twips(tocWidths.get(level)!)}"/><w:tab w:val="right" w:leader="dot" w:pos="${twips(contentWidth)}"/></w:tabs>`
          );
        }
        tocStyles.set(key, styleId);
      }
      if (entry)
        children.push(
          new InternalHyperlink({
            anchor: entry.bookmark,
            children: [
              new TextRun(entry.text),
              new TextRun({ children: [new Tab()] }),
              new TextRun(String(entry.page)),
            ],
          })
        );
      if (index === entries.length - 1)
        children.push(fieldRun('w:fldChar', { 'w:fldCharType': 'end' }));
      result.push(new ModelParagraph(styleId, children));
    });
    return result;
  };
  const pictureStyles = new Map<NonNullable<ImageBlock['align']>, string>();
  const getPictureStyle = (align: NonNullable<ImageBlock['align']> = 'left') => {
    let styleId = pictureStyles.get(align);
    if (!styleId) {
      styleId = generatedStyle(
        'Picture',
        {
          ...base,
          builtIn: false,
          basedOn: undefined,
          outlineLevel: undefined,
          align,
          indent: { firstLineChars: 0, hangingChars: 0, leftChars: 0, rightChars: 0 },
          lineSpacing: { rule: 'multiple', value: 1 },
          spaceBeforePt: 0,
          spaceAfterPt: 0,
          keepNext: false,
          pageBreakBefore: false,
          snapToGrid: false,
        },
        '',
        align === 'left' ? '图片' : align === 'center' ? '图片居中' : '图片右对齐'
      );
      pictureStyles.set(align, styleId);
    }
    return styleId;
  };
  const mathStyles = new Map<string, string>();
  const mathParagraph = async (block: MathBlock, contentWidth: number) => {
    const numbered = block.numberText !== undefined && block.numberText !== '';
    const sourceStyle = block.styleId ? styles.get(block.styleId)! : undefined;
    const key = `${contentWidth}:${numbered}:${block.styleId ?? ''}`;
    let styleId = block.paragraphStyleId ?? mathStyles.get(key);
    if (!styleId) {
      const tabs = numbered
        ? `<w:tabs><w:tab w:val="center" w:pos="${twips(contentWidth / 2)}"/><w:tab w:val="right" w:pos="${twips(contentWidth)}"/></w:tabs>`
        : '';
      styleId = generatedStyle(
        'Equation',
        {
          ...(sourceStyle ?? base),
          builtIn: false,
          basedOn: undefined,
          outlineLevel: undefined,
          align: numbered ? 'left' : 'center',
          lineSpacing: sourceStyle?.lineSpacing ?? { rule: 'atLeast', pt: base.sizePt * 1.2 },
          indent: { firstLineChars: 0, leftChars: 0, rightChars: 0 },
          spaceBeforePt: 0,
          spaceAfterPt: 0,
          keepNext: false,
          pageBreakBefore: false,
        },
        tabs,
        '公式'
      );
      mathStyles.set(key, styleId);
    }
    const math = await mathChild(block, true);
    return new ModelParagraph(
      styleId,
      numbered
        ? [
            new TextRun({ children: [new Tab()] }),
            ...math,
            new TextRun({ children: [new Tab()] }),
            new TextRun(block.numberText!),
          ]
        : math
    );
  };
  const blocks = async (
    items: Block[],
    main = false,
    contentWidth = 450
  ): Promise<(Paragraph | Table)[]> => {
    const result: (Paragraph | Table)[] = [];
    for (const [index, block] of items.entries()) {
      // A break paragraph after a page-filling table lands alone on the next page
      // and breaks again. Before a paragraph, break on that paragraph instead.
      if (block.type === 'pageBreak' && ['p', 'image'].includes(items[index + 1]?.type ?? ''))
        continue;
      const breakBefore = items[index - 1]?.type === 'pageBreak';
      const start = result.length;
      if (block.type === 'p') result.push(await paragraph(block, main));
      else if (block.type === 'image')
        result.push(
          new ModelParagraph(block.styleId ?? getPictureStyle(block.align), [await imageRun(block)])
        );
      else if (block.type === 'table') result.push(await table(block, main));
      else if (block.type === 'math') result.push(await mathParagraph(block, contentWidth));
      else if (block.type === 'pageBreak')
        result.push(new ModelParagraph('Normal', [new PageBreak()]));
      else result.push(...toc(block, contentWidth));
      if (breakBefore && (block.type === 'p' || block.type === 'image'))
        breakBeforeParagraph(result[start] as Paragraph);
    }
    return result;
  };
  const mirrored =
    model.settings?.evenAndOddHeaders === true ||
    model.sections.some(
      (section) =>
        section.headerEven !== undefined ||
        ['outside', 'inside'].includes(section.pageNumber?.placement ?? '')
    );
  const sections: ISectionOptions[] = [];
  for (const [sectionIndex, section] of model.sections.entries()) {
    const { page, pageNumber } = section;
    sectionLayout = {
      sectionIndex,
      tableIndex: 0,
      bodyHeightPt: page.heightPt - page.margins.topPt - page.margins.bottomPt,
    };
    const contentWidth = page.widthPt - page.margins.leftPt - page.margins.rightPt;
    const headerContent = await blocks(section.header ?? [], false, contentWidth);
    const evenHeaderContent =
      section.headerEven === undefined
        ? headerContent
        : await blocks(section.headerEven, false, contentWidth);
    const footerContent = await blocks(section.footer ?? [], false, contentWidth);
    const makeFooter = (even: boolean, first = false) => {
      const content = [...footerContent];
      if (pageNumber && !(first && pageNumber.hideOnFirstPage)) {
        const { placement } = pageNumber;
        const align =
          placement === 'outside'
            ? even
              ? 'left'
              : 'right'
            : placement === 'inside'
              ? even
                ? 'right'
                : 'left'
              : placement;
        const style: StyleDef = {
          ...base,
          id: '',
          name: '',
          builtIn: false,
          basedOn: undefined,
          next: undefined,
          font: pageNumber.font,
          sizePt: pageNumber.sizePt,
          align,
          outlineLevel: undefined,
          keepNext: false,
          pageBreakBefore: false,
          indent:
            align === 'right'
              ? { rightChars: pageNumber.outsideIndentChars ?? 0 }
              : align === 'left'
                ? { leftChars: pageNumber.outsideIndentChars ?? 0 }
                : undefined,
        };
        const styleId =
          pageNumber.styleIds?.[even ? 'even' : 'default'] ?? generatedStyle('PageNumber', style);
        const children: ParagraphChild[] = [];
        pageNumber.format.split('%PAGE%').forEach((part, i) => {
          if (i) children.push(new SimpleField('PAGE', String(pageNumber.restart ?? 1)));
          if (part) children.push(new TextRun(part));
        });
        content.push(new ModelParagraph(styleId, children));
      }
      return new Footer({ children: content });
    };
    sections.push({
      properties: {
        type: section.startType ?? 'nextPage',
        column: { count: section.columns?.count ?? 1, space: twips(section.columns?.spacePt ?? 0) },
        titlePage: pageNumber?.hideOnFirstPage ?? false,
        page: {
          size: {
            width: twips(page.widthPt),
            height: twips(page.heightPt),
            orientation: page.orientation,
          },
          margin: {
            top: twips(page.margins.topPt),
            bottom: twips(page.margins.bottomPt),
            left: twips(page.margins.leftPt),
            right: twips(page.margins.rightPt),
            header: twips(page.margins.headerPt),
            footer: twips(page.margins.footerPt),
          },
          pageNumbers:
            pageNumber?.restart === undefined ? undefined : { start: pageNumber.restart },
        },
      },
      headers: {
        default: new Header({ children: headerContent }),
        ...(mirrored ? { even: new Header({ children: evenHeaderContent }) } : {}),
        ...(pageNumber?.hideOnFirstPage ? { first: new Header({ children: headerContent }) } : {}),
      },
      footers: {
        default: makeFooter(false),
        ...(mirrored ? { even: makeFooter(true) } : {}),
        ...(pageNumber?.hideOnFirstPage ? { first: makeFooter(false, true) } : {}),
      },
      children: await blocks(
        section.blocks,
        true,
        (contentWidth - ((section.columns?.count ?? 1) - 1) * (section.columns?.spacePt ?? 0)) /
          (section.columns?.count ?? 1)
      ),
    });
    // Section page sizes are explicit; docx swaps landscape dimensions. Restore after packing.
  }
  const language = model.settings?.language ?? 'zh-CN';
  const nativeFootnotes: Record<string, { children: Paragraph[] }> = {};
  for (const note of model.footnotes ?? []) {
    const children: Paragraph[] = [];
    for (const block of note.blocks) {
      let styleId = block.styleId;
      const visited = new Set<string>();
      let ancestor = styles.get(styleId);
      while (ancestor && ancestor.id !== 'FootnoteText' && !visited.has(ancestor.id)) {
        visited.add(ancestor.id);
        ancestor = ancestor.basedOn ? styles.get(ancestor.basedOn) : undefined;
      }
      if (ancestor?.id !== 'FootnoteText') styleId = 'FootnoteText';
      children.push(await paragraph({ ...block, styleId }, false));
    }
    nativeFootnotes[String(footnoteNumbers.get(note.id))] = { children };
  }
  const document = new Document({
    sections,
    evenAndOddHeaderAndFooters: mirrored,
    footnotes: nativeFootnotes,
  });
  const zip = await JSZip.loadAsync(await Packer.toBuffer(document));
  const styleDefinitions = [...model.styles];
  if (!styles.has('Normal')) styleDefinitions.unshift(base);
  for (const level of new Set([1, 2, 3, ...tocWidths.keys()])) {
    if (!styles.has(`TOC${level}`))
      styleDefinitions.push({ ...base, id: `TOC${level}`, name: `toc ${level}`, builtIn: true });
  }
  const definitions =
    styleDefinitions
      .map((style) => {
        const level = /^TOC([1-9])$/.exec(style.id)?.[1];
        const width = level ? tocWidths.get(Number(level)) : undefined;
        const tabs =
          width === undefined
            ? ''
            : `<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${twips(width)}"/></w:tabs>`;
        const name =
          style.id === 'Normal'
            ? 'Normal'
            : style.id === 'Title'
              ? 'Title'
              : style.id === 'Header'
                ? 'header'
                : style.id === 'Caption'
                  ? 'caption'
                  : style.id === 'FootnoteText'
                    ? 'footnote text'
                    : /^Heading[1-4]$/.test(style.id)
                      ? `heading ${style.id.slice(-1)}`
                      : level
                        ? `toc ${level}`
                        : style.name;
        return styleXml(style, style.id, name, tabs);
      })
      .join('') + extraStyles.join('');
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:lang w:val="${language}" w:eastAsia="${language}"/></w:rPr></w:rPrDefault></w:docDefaults>${definitions}</w:styles>`
  );
  zip.file('word/numbering.xml', numberingXml(model));
  if (model.settings?.compressPunctuation !== undefined) {
    const settings = await zip.file('word/settings.xml')!.async('string');
    zip.file(
      'word/settings.xml',
      settings
        .replace(/<w:characterSpacingControl\b[^>]*\/>/g, '')
        .replace(
          '</w:settings>',
          `${tag('characterSpacingControl', model.settings.compressPunctuation ? 'compressPunctuation' : 'doNotCompress')}</w:settings>`
        )
    );
  }
  // docx emits unused footnote separators with direct formatting by default.
  if (!footnoteNumbers.size)
    zip.file(
      'word/footnotes.xml',
      `<?xml version="1.0" encoding="UTF-8"?><w:footnotes xmlns:w="${W}"/>`
    );
  else {
    let footnotesXml = await zip.file('word/footnotes.xml')!.async('string');
    // docx resolves image placeholders in document/header/footer parts, but not footnotes.
    const footnoteImageFiles = new Set(
      [...footnotesXml.matchAll(/r:embed="rId\{([^{}"]+)\}"/g)].map((match) => match[1])
    );
    if (footnoteImageFiles.size) {
      const relationshipsPath = 'word/_rels/footnotes.xml.rels';
      let relationships = await zip.file(relationshipsPath)!.async('string');
      const additions: string[] = [];
      let nextImageId = 1;
      for (const fileName of footnoteImageFiles) {
        if (!zip.file(`word/media/${fileName}`))
          throw new Error(`Footnote image media is missing: ${fileName}`);
        let id: string;
        do id = `rIdDocModelFootnoteImage${nextImageId++}`;
        while (relationships.includes(`Id="${id}"`));
        additions.push(
          `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${xml(fileName)}"/>`
        );
        footnotesXml = footnotesXml.split(`r:embed="rId{${fileName}}"`).join(`r:embed="${id}"`);
      }
      relationships = relationships.includes('</Relationships>')
        ? relationships.replace('</Relationships>', `${additions.join('')}</Relationships>`)
        : relationships.replace(/\/>\s*$/, `>${additions.join('')}</Relationships>`);
      zip.file(relationshipsPath, relationships);
    }
    zip.file(
      'word/footnotes.xml',
      footnotesXml.replace(
        /<w:footnote\b([^>]*)>([\s\S]*?)<\/w:footnote>/g,
        (whole, attrs: string, body: string) => {
          const separator = /w:type="(separator|continuationSeparator)"/.exec(attrs)?.[1];
          if (separator)
            return `<w:footnote${attrs}><w:p><w:pPr>${tag('pStyle', 'FootnoteText')}</w:pPr><w:r><w:${separator}/></w:r></w:p></w:footnote>`;
          const number = Number(/w:id="(\d+)"/.exec(attrs)?.[1]);
          const marker = footnoteMarkers.get(number);
          return marker
            ? `<w:footnote${attrs}>${body.replace(/<w:footnoteRef\s*\/>/, `<w:t xml:space="preserve">${xml(marker)}</w:t>`)}</w:footnote>`
            : whole;
        }
      )
    );
  }
  // Inspect XML parts one at a time; embedded media stays compressed and untouched.
  for (const name of Object.keys(zip.files).filter((name) => /\.(?:xml|rels)$/i.test(name))) {
    let content = await zip.file(name)!.async('string');
    if (/^word\/(document|header\d+|footer\d+|footnotes)\.xml$/.test(name)) {
      content = content.replace(/<w:(?:bCs|iCs)(?:\s[^>]*)?\/>/g, '');
      content = separateAdjacentTables(content);
    }
    if (name === 'word/document.xml') {
      let sectionIndex = 0;
      content = content.replace(/<w:pgSz\b[^>]*\/>/g, () => {
        const page = model.sections[sectionIndex++].page;
        return `<w:pgSz w:w="${twips(page.widthPt)}" w:h="${twips(page.heightPt)}" w:orient="${page.orientation}"/>`;
      });
      content = normalizeSectionBreaks(content);
    }
    const filtered = filterXmlCharacters(content);
    if (filtered.removed) {
      report.xmlPartsCharactersFiltered[name] = filtered.removed;
      report.xmlCharactersFiltered += filtered.removed;
    }
    zip.file(name, filtered.text);
  }
  return {
    buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
    report,
  };
}

/** Library section delimiters may attach to real paragraphs; tables require a separate delimiter. */
function normalizeSectionBreaks(content: string): string {
  const start = content.indexOf('<w:body>') + '<w:body>'.length;
  const end = content.lastIndexOf('</w:body>');
  const body = content.slice(start, end);
  const parts: string[] = [];
  let depth = 0;
  let blockStart = 0;
  for (const match of body.matchAll(/<[^>]+>/g)) {
    const token = match[0];
    if (token.startsWith('</')) depth--;
    else if (!token.endsWith('/>') && !token.startsWith('<?')) depth++;
    if (depth === 0) {
      const block = body.slice(blockStart, match.index! + token.length);
      const section = /^<w:p><w:pPr>(<w:sectPr>[\s\S]*?<\/w:sectPr>)<\/w:pPr><\/w:p>$/.exec(
        block
      )?.[1];
      const previous = parts.at(-1);
      if (section && previous?.startsWith('<w:p>') && !previous.includes('<w:sectPr>')) {
        parts[parts.length - 1] = previous.includes('<w:pPr>')
          ? previous.replace('</w:pPr>', `${section}</w:pPr>`)
          : previous.replace('<w:p>', `<w:p><w:pPr>${section}</w:pPr>`);
      } else parts.push(block);
      blockStart = match.index! + token.length;
    }
  }
  return content.slice(0, start) + parts.join('') + content.slice(end);
}
