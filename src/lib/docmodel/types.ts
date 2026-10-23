import { z } from 'zod';
import { isAbsolute } from 'node:path';

const text = z.string();
const id = text.min(1);
const number = z.number().finite();
const positive = number.positive();
const nonnegative = number.nonnegative();
const integer = number.int().nonnegative();
const color = text.regex(/^[\da-fA-F]{6}$/, 'Expected RRGGBB color');
const fontSchema = z.object({ eastAsia: text, ascii: text }).strict();
const indentSchema = z
  .object({
    firstLineChars: number.optional(),
    hangingChars: number.optional(),
    leftChars: number.optional(),
    rightChars: number.optional(),
  })
  .strict();

export const styleDefSchema = z
  .object({
    id: id.regex(/^[\x20-\x7e]+$/, 'Style id must be ASCII'),
    name: text,
    builtIn: z.boolean().optional(),
    basedOn: id.optional(),
    next: id.optional(),
    outlineLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
    font: fontSchema,
    sizePt: positive,
    bold: z.boolean().optional(),
    color: color.optional(),
    align: z.enum(['left', 'center', 'right', 'justify', 'distribute']),
    indent: indentSchema.optional(),
    lineSpacing: z.union([
      z.object({ rule: z.literal('exact'), pt: positive }).strict(),
      z.object({ rule: z.literal('atLeast'), pt: positive }).strict(),
      z.object({ rule: z.literal('multiple'), value: positive }).strict(),
    ]),
    spaceBeforePt: number.optional(),
    spaceAfterPt: number.optional(),
    keepNext: z.boolean().optional(),
    pageBreakBefore: z.boolean().optional(),
    snapToGrid: z.boolean().optional(),
  })
  .strict();
export type StyleDef = z.infer<typeof styleDefSchema>;

export const numberingDefSchema = z
  .object({
    id,
    levels: z.array(
      z
        .object({
          level: integer,
          format: z.enum([
            'chineseCounting',
            'chineseCountingThousand',
            'decimal',
            'decimalFullWidth',
            'lowerLetter',
            'upperLetter',
            'lowerRoman',
            'upperRoman',
          ]),
          text,
          start: integer,
          restartAfterLevel: number.int().min(-1).optional(),
          suffix: z.enum(['nothing', 'space', 'tab']),
          styleId: id.optional(),
          run: z
            .object({ bold: z.boolean().optional(), font: fontSchema.optional() })
            .strict()
            .optional(),
          indent: indentSchema.omit({ rightChars: true }).optional(),
        })
        .strict()
        .superRefine((level, ctx) => {
          if (level.restartAfterLevel !== undefined && level.restartAfterLevel >= level.level)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['restartAfterLevel'],
              message: 'Restart trigger must precede this numbering level, or be -1 for never',
            });
          if (level.indent && !level.styleId)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['styleId'],
              message: 'Numbering indentation requires a bound paragraph style',
            });
        })
    ),
  })
  .strict();
export type NumberingDef = z.infer<typeof numberingDefSchema>;
export const numberingInstanceSchema = z
  .object({
    id,
    numberingId: id,
    restartAt: integer.optional(),
    startOverrides: z
      .array(z.object({ level: integer.max(8), start: positive.int() }).strict())
      .optional(),
  })
  .strict();
export type NumberingInstance = z.infer<typeof numberingInstanceSchema>;

export const runSchema = z
  .object({
    text,
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    color: color.optional(),
  })
  .strict();
export type Run = z.infer<typeof runSchema>;

export const imageBlockSchema = z
  .object({
    type: z.literal('image'),
    path: text.refine(isAbsolute, 'Image path must be absolute'),
    widthPt: positive,
    heightPt: positive,
    align: z.enum(['left', 'center', 'right']).optional(),
    floating: z
      .object({
        xPt: number,
        yPt: number,
        xRelativeTo: z.enum(['page', 'margin', 'column']),
        yRelativeTo: z.enum(['page', 'margin', 'paragraph']),
        wrap: z.literal('none'),
        inFront: z.boolean(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type ImageBlock = z.infer<typeof imageBlockSchema>;

export const paragraphBlockSchema = z
  .object({
    type: z.literal('p'),
    styleId: id,
    runs: z.array(runSchema),
    numbering: z.object({ instanceId: id, level: integer }).strict().optional(),
    bookmark: id.optional(),
    anchors: z.array(imageBlockSchema).optional(),
  })
  .strict();
export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>;
export const borderSchema = z
  .object({
    sizePt: nonnegative,
    color: color.optional(),
    style: z.enum(['single', 'double']).optional(),
  })
  .strict();
export type Border = z.infer<typeof borderSchema>;
const cellBorders = z
  .object({
    top: borderSchema.optional(),
    bottom: borderSchema.optional(),
    left: borderSchema.optional(),
    right: borderSchema.optional(),
  })
  .strict();
export const tableBlockSchema = z
  .object({
    type: z.literal('table'),
    columnsPt: z.array(positive).min(1),
    align: z.enum(['left', 'center']).optional(),
    borders: cellBorders
      .extend({ insideH: borderSchema.optional(), insideV: borderSchema.optional() })
      .strict(),
    rows: z.array(
      z
        .object({
          heightPt: positive.optional(),
          header: z.boolean().optional(),
          cells: z.array(
            z
              .object({
                blocks: z.array(
                  z.discriminatedUnion('type', [paragraphBlockSchema, imageBlockSchema])
                ),
                colSpan: integer.min(1).optional(),
                rowSpan: integer.min(1).optional(),
                vAlign: z.enum(['top', 'center', 'bottom']).optional(),
                borders: cellBorders.optional(),
              })
              .strict()
          ),
        })
        .strict()
    ),
  })
  .strict();
export type TableBlock = z.infer<typeof tableBlockSchema>;
export const tocBlockSchema = z
  .object({
    type: z.literal('toc'),
    title: z.object({ text, styleId: id }).strict().optional(),
    levels: z.tuple([integer.min(1), integer.min(1)]),
    entries: z.array(
      z.object({ text, level: integer.min(1), page: integer.min(1), bookmark: id }).strict()
    ),
  })
  .strict();
export type TocBlock = z.infer<typeof tocBlockSchema>;
export const pageBreakBlockSchema = z.object({ type: z.literal('pageBreak') }).strict();
export type PageBreakBlock = z.infer<typeof pageBreakBlockSchema>;
export const blockSchema = z.discriminatedUnion('type', [
  paragraphBlockSchema,
  tableBlockSchema,
  imageBlockSchema,
  tocBlockSchema,
  pageBreakBlockSchema,
]);
export type Block = z.infer<typeof blockSchema>;
export const sectionDefSchema = z
  .object({
    page: z
      .object({
        widthPt: positive,
        heightPt: positive,
        orientation: z.enum(['portrait', 'landscape']),
        margins: z
          .object({
            topPt: nonnegative,
            bottomPt: nonnegative,
            leftPt: nonnegative,
            rightPt: nonnegative,
            headerPt: nonnegative,
            footerPt: nonnegative,
          })
          .strict(),
      })
      .strict(),
    startType: z.enum(['nextPage', 'continuous', 'oddPage']).optional(),
    pageNumber: z
      .object({
        format: text,
        font: fontSchema,
        sizePt: positive,
        placement: z.enum(['center', 'outside', 'inside', 'left', 'right']),
        outsideIndentChars: number.optional(),
        restart: integer.optional(),
        hideOnFirstPage: z.boolean().optional(),
      })
      .strict()
      .optional(),
    header: z.array(blockSchema).optional(),
    footer: z.array(blockSchema).optional(),
    blocks: z.array(blockSchema),
  })
  .strict();
export type SectionDef = z.infer<typeof sectionDefSchema>;

const modelShape = z
  .object({
    version: z.literal(1),
    styles: z.array(styleDefSchema),
    numbering: z.array(numberingDefSchema),
    numberingInstances: z.array(numberingInstanceSchema),
    sections: z.array(sectionDefSchema).min(1),
    settings: z
      .object({
        language: z.enum(['zh-CN', 'en-US']).optional(),
        compressPunctuation: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type DocModel = z.infer<typeof modelShape>;

type Path = (string | number)[];

/** Strict structural and cross-reference validation of the shared DocModel v1 contract. */
export const docModelSchema = modelShape.superRefine((model, ctx) => {
  const issue = (path: Path, message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  const unique = (items: { id: string }[], path: string) => {
    const ids = new Set<string>();
    items.forEach((item, i) => {
      if (ids.has(item.id)) issue([path, i, 'id'], `Duplicate id: ${item.id}`);
      ids.add(item.id);
    });
  };
  unique(model.styles, 'styles');
  unique(model.numbering, 'numbering');
  unique(model.numberingInstances, 'numberingInstances');
  const styles = new Map(model.styles.map((s) => [s.id, s]));
  const definitions = new Map(model.numbering.map((n) => [n.id, n]));
  const instances = new Map(model.numberingInstances.map((n) => [n.id, n]));
  const styleRef = (value: string, path: Path) => {
    if (!styles.has(value)) issue(path, `Unknown style: ${value}`);
  };
  model.styles.forEach((style, i) => {
    if (style.basedOn) styleRef(style.basedOn, ['styles', i, 'basedOn']);
    if (style.next) styleRef(style.next, ['styles', i, 'next']);
    if (
      /^Heading[1-4]$/i.test(style.id) ||
      (style.builtIn && /^heading [1-4]$/i.test(style.name))
    ) {
      if (style.outlineLevel === undefined)
        issue(['styles', i, 'outlineLevel'], 'Heading styles require outlineLevel');
    }
    const visited = new Set([style.id]);
    let ancestor = style.basedOn;
    while (ancestor && styles.has(ancestor)) {
      if (visited.has(ancestor)) {
        issue(['styles', i, 'basedOn'], 'Cyclic style inheritance');
        break;
      }
      visited.add(ancestor);
      ancestor = styles.get(ancestor)?.basedOn;
    }
  });
  const styleIndent = (styleId: string): NonNullable<StyleDef['indent']> => {
    const ancestors: StyleDef[] = [];
    const visited = new Set<string>();
    let current = styles.get(styleId);
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      ancestors.unshift(current);
      current = current.basedOn ? styles.get(current.basedOn) : undefined;
    }
    return Object.assign({}, ...ancestors.map((style) => style.indent ?? {}));
  };
  const validateIndent = (
    indent: NumberingDef['levels'][number]['indent'],
    styleId: string,
    path: Path
  ) => {
    if (!indent || !styles.has(styleId)) return;
    const expected = styleIndent(styleId);
    for (const key of ['firstLineChars', 'hangingChars', 'leftChars'] as const) {
      if (indent[key] !== undefined && indent[key] !== (expected[key] ?? 0)) {
        issue([...path, key], `Numbering indent must match paragraph style ${styleId}`);
      }
    }
  };
  model.numbering.forEach((definition, i) => {
    const levels = new Set<number>();
    definition.levels.forEach((level, j) => {
      if (levels.has(level.level))
        issue(['numbering', i, 'levels', j, 'level'], 'Duplicate numbering level');
      levels.add(level.level);
      if (level.styleId) {
        styleRef(level.styleId, ['numbering', i, 'levels', j, 'styleId']);
        validateIndent(level.indent, level.styleId, ['numbering', i, 'levels', j, 'indent']);
      }
    });
  });
  model.numberingInstances.forEach((instance, i) => {
    const definition = definitions.get(instance.numberingId);
    if (!definition)
      issue(
        ['numberingInstances', i, 'numberingId'],
        `Unknown numbering definition: ${instance.numberingId}`
      );
    const firstLevel = Math.min(...(definition?.levels ?? []).map((level) => level.level));
    const overridden = new Set<number>();
    instance.startOverrides?.forEach((override, j) => {
      const path: Path = ['numberingInstances', i, 'startOverrides', j];
      if (overridden.has(override.level))
        issue([...path, 'level'], 'Duplicate start override level');
      overridden.add(override.level);
      if (definition && !definition.levels.some((level) => level.level === override.level))
        issue([...path, 'level'], 'Start override references an undefined numbering level');
      if (
        override.level === firstLevel &&
        instance.restartAt !== undefined &&
        override.start !== instance.restartAt
      )
        issue(
          [...path, 'start'],
          'Start override conflicts with restartAt for the first numbering level'
        );
    });
  });
  const bookmarks = new Set<string>();
  const links: { bookmark: string; path: Path }[] = [];
  let heading = 0;
  const addBookmark = (name: string, path: Path) => {
    if (bookmarks.has(name)) issue(path, `Duplicate bookmark: ${name}`);
    bookmarks.add(name);
  };
  const paragraph = (block: ParagraphBlock, path: Path, main: boolean) => {
    styleRef(block.styleId, [...path, 'styleId']);
    const isHeading = styles.get(block.styleId)?.outlineLevel !== undefined;
    if (main && isHeading) heading++;
    if (block.bookmark) addBookmark(block.bookmark, [...path, 'bookmark']);
    else if (main && isHeading) addBookmark(`_heading_${heading}`, path);
    if (block.numbering) {
      const instance = instances.get(block.numbering.instanceId);
      if (!instance)
        issue(
          [...path, 'numbering', 'instanceId'],
          `Unknown numbering instance: ${block.numbering.instanceId}`
        );
      else if (
        !definitions
          .get(instance.numberingId)
          ?.levels.some((l) => l.level === block.numbering?.level)
      )
        issue([...path, 'numbering', 'level'], 'Numbering level is not defined by this instance');
    }
  };
  const visit = (blocks: Block[], path: Path, main: boolean) =>
    blocks.forEach((block, i) => {
      const p = [...path, i];
      if (block.type === 'p') paragraph(block, p, main);
      else if (block.type === 'toc') {
        if (block.title) styleRef(block.title.styleId, [...p, 'title', 'styleId']);
        if (block.levels[0] > block.levels[1])
          issue([...p, 'levels'], 'TOC level range must be ascending');
        block.entries.forEach((entry, j) =>
          links.push({ bookmark: entry.bookmark, path: [...p, 'entries', j, 'bookmark'] })
        );
      } else if (block.type === 'table') {
        const occupancy = block.rows.map(() => Array<boolean>(block.columnsPt.length).fill(false));
        block.rows.forEach((row, r) => {
          let column = 0;
          row.cells.forEach((cell, c) => {
            const cp = [...p, 'rows', r, 'cells', c];
            while (occupancy[r][column]) column++;
            const width = cell.colSpan ?? 1;
            const height = cell.rowSpan ?? 1;
            if (column + width > block.columnsPt.length)
              issue([...cp, 'colSpan'], 'Cell exceeds the table column count');
            if (r + height > block.rows.length)
              issue([...cp, 'rowSpan'], 'Cell exceeds the table row count');
            for (let y = r; y < Math.min(r + height, block.rows.length); y++) {
              for (let x = column; x < Math.min(column + width, block.columnsPt.length); x++) {
                if (occupancy[y][x]) issue(cp, 'Cell overlaps a merged cell');
                occupancy[y][x] = true;
              }
            }
            column += width;
            cell.blocks.forEach((b, j) => {
              if (b.type === 'p') paragraph(b, [...cp, 'blocks', j], main);
            });
          });
          if (occupancy[r].some((value) => !value))
            issue([...p, 'rows', r, 'cells'], 'Cells do not cover the table columns');
        });
      }
    });
  model.sections.forEach((section, i) => {
    visit(section.blocks, ['sections', i, 'blocks'], true);
    if (section.header) visit(section.header, ['sections', i, 'header'], false);
    if (section.footer) visit(section.footer, ['sections', i, 'footer'], false);
  });
  links.forEach((link) => {
    if (!bookmarks.has(link.bookmark)) issue(link.path, `Unknown bookmark: ${link.bookmark}`);
  });
});

/** Accepts an already decoded JSON value, or a JSON string; errors include every failing path. */
export function parseDocModel(json: unknown): DocModel {
  let value = json;
  if (typeof json === 'string') {
    try {
      value = JSON.parse(json);
    } catch (error) {
      throw new Error(
        `Invalid DocModel JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  const result = docModelSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `Invalid DocModel:\n${result.error.issues.map((issue) => `${issue.path.length ? issue.path.map((part, i) => (typeof part === 'number' ? `[${part}]` : `${i ? '.' : ''}${part}`)).join('') : '$'}: ${issue.message}`).join('\n')}`
    );
  }
  return result.data;
}
