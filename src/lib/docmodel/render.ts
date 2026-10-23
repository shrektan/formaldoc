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
import type {
  Block,
  Border,
  DocModel,
  ImageBlock,
  ParagraphBlock,
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

function fieldRun(name: string, attributes: Record<string, string>, text?: string): TextRun {
  const run = new TextRun({});
  const component = new ImportedXmlComponent(name, attributes);
  if (text !== undefined) component.push(text);
  run.addChildElement(component);
  return run;
}

function styleXml(style: StyleDef, id: string, name = style.name, extra = ''): string {
  const spacing = style.lineSpacing;
  const pPr = [
    style.keepNext === undefined ? '' : tag('keepNext', Number(style.keepNext)),
    style.pageBreakBefore === undefined
      ? ''
      : tag('pageBreakBefore', Number(style.pageBreakBefore)),
    tag('snapToGrid', Number(style.snapToGrid ?? false)),
    extra,
    `<w:spacing w:before="${twips(style.spaceBeforePt ?? 0)}" w:after="${twips(style.spaceAfterPt ?? 0)}" w:line="${spacing.rule === 'multiple' ? Math.round(spacing.value * 240) : twips(spacing.pt)}" w:lineRule="${spacing.rule === 'multiple' ? 'auto' : spacing.rule}"/>`,
    indentXml(style.indent, style.sizePt),
    tag('jc', style.align === 'justify' ? 'both' : style.align),
    style.outlineLevel === undefined ? '' : tag('outlineLvl', style.outlineLevel),
  ].join('');
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
              `<w:lvl w:ilvl="${level.level}">${tag('start', level.start)}${tag('numFmt', level.format === 'chineseCounting' ? 'chineseCountingThousand' : level.format)}${level.styleId ? tag('pStyle', level.styleId) : ''}${tag('suff', level.suffix)}${tag('lvlText', level.text)}${tag('lvlJc', 'left')}<w:pPr>${indentXml(level.indent, level.styleId ? sizes.get(level.styleId)! : 0)}</w:pPr><w:rPr>${level.run?.font ? fonts(level.run.font) : ''}${level.run?.bold === undefined ? '' : tag('b', Number(level.run.bold))}</w:rPr></w:lvl>`
          )
          .join('')}</w:abstractNum>`
    )
    .join('')}${model.numberingInstances
    .map(
      (instance, index) =>
        `<w:num w:numId="${index + 1}">${tag(
          'abstractNumId',
          model.numbering.findIndex((def) => def.id === instance.numberingId)
        )}${instance.restartAt === undefined ? '' : `<w:lvlOverride w:ilvl="${firstLevels.get(instance.numberingId)}">${tag('startOverride', instance.restartAt)}</w:lvlOverride>`}</w:num>`
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
      else if (block.type === 'toc' && block.title)
        block.title.styleId = resolve(block.title.styleId);
      else if (block.type === 'table')
        for (const row of block.rows) for (const cell of row.cells) visit(cell.blocks);
    }
  };
  for (const section of model.sections) {
    visit(section.blocks);
    visit(section.header ?? []);
    visit(section.footer ?? []);
  }
  return model;
}

/** Generate independently of the Markdown pipeline; image bytes are cached per path. */
export async function renderDocModel(input: DocModel): Promise<Buffer> {
  const model = normalizeBuiltInStyles(parseDocModel(input));
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
  const paragraph = async (block: ParagraphBlock, main: boolean) => {
    const children: ParagraphChild[] = block.runs.map(
      (run) =>
        new TextRun({
          text: run.text,
          bold: run.bold,
          italics: run.italic,
          underline:
            run.underline === undefined ? undefined : { type: run.underline ? 'single' : 'none' },
          color: run.color,
        })
    );
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
  const table = async (block: TableBlock, main: boolean) => {
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
    for (const row of block.rows) {
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
        cells.push(
          new TableCell({
            children: cell ? await blocks(cell.blocks, main) : [new ModelParagraph('Normal', [])],
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
      rows.push(
        new TableRow({
          children: cells,
          tableHeader: row.header,
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
  const blocks = async (
    items: Block[],
    main = false,
    contentWidth = 450
  ): Promise<(Paragraph | Table)[]> => {
    const result: (Paragraph | Table)[] = [];
    for (const block of items) {
      if (block.type === 'p') result.push(await paragraph(block, main));
      else if (block.type === 'image')
        result.push(new ModelParagraph(getPictureStyle(block.align), [await imageRun(block)]));
      else if (block.type === 'table') result.push(await table(block, main));
      else if (block.type === 'pageBreak')
        result.push(new ModelParagraph('Normal', [new PageBreak()]));
      else result.push(...toc(block, contentWidth));
    }
    return result;
  };
  const mirrored = model.sections.some((section) =>
    ['outside', 'inside'].includes(section.pageNumber?.placement ?? '')
  );
  const sections: ISectionOptions[] = [];
  for (const section of model.sections) {
    const { page, pageNumber } = section;
    const contentWidth = page.widthPt - page.margins.leftPt - page.margins.rightPt;
    const headerContent = await blocks(section.header ?? [], false, contentWidth);
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
        const styleId = generatedStyle('PageNumber', style);
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
        ...(mirrored ? { even: new Header({ children: headerContent }) } : {}),
        ...(pageNumber?.hideOnFirstPage ? { first: new Header({ children: headerContent }) } : {}),
      },
      footers: {
        default: makeFooter(false),
        ...(mirrored ? { even: makeFooter(true) } : {}),
        ...(pageNumber?.hideOnFirstPage ? { first: makeFooter(false, true) } : {}),
      },
      children: await blocks(section.blocks, true, contentWidth),
    });
    // Section page sizes are explicit; docx swaps landscape dimensions. Restore after packing.
  }
  const language = model.settings?.language ?? 'zh-CN';
  const document = new Document({ sections, evenAndOddHeaderAndFooters: mirrored });
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
  zip.file(
    'word/footnotes.xml',
    `<?xml version="1.0" encoding="UTF-8"?><w:footnotes xmlns:w="${W}"/>`
  );
  // Only decompress XML parts that need normalization; media stays compressed and untouched.
  for (const name of Object.keys(zip.files).filter((name) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/.test(name)
  )) {
    let content = await zip.file(name)!.async('string');
    content = content.replace(/<w:(?:bCs|iCs)(?:\s[^>]*)?\/>/g, '');
    if (name === 'word/document.xml') {
      let sectionIndex = 0;
      content = content.replace(/<w:pgSz\b[^>]*\/>/g, () => {
        const page = model.sections[sectionIndex++].page;
        return `<w:pgSz w:w="${twips(page.widthPt)}" w:h="${twips(page.heightPt)}" w:orient="${page.orientation}"/>`;
      });
      content = normalizeSectionBreaks(content);
    }
    zip.file(name, content);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
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
