import { useMemo, type ReactNode } from 'react';
import type {
  Root,
  Content,
  PhrasingContent,
  List,
  ListItem,
  Table as MdTable,
  TableRow as MdTableRow,
  TableCell as MdTableCell,
} from 'mdast';
import type { ChineseFont, StyleSettings, TextStyle } from '../../types/styles';
import { parseMarkdown } from '../../lib/markdown/parser';

interface DocxPreviewProps {
  markdown: string;
  styles: StyleSettings;
}

const LINE_HEIGHT = '28pt';

const FONT_FAMILY_MAP: Record<ChineseFont, string> = {
  宋体: '"SimSun", "Songti SC", "STSong", serif',
  黑体: '"SimHei", "Heiti SC", "Microsoft YaHei", sans-serif',
  楷体: '"KaiTi", "Kaiti SC", serif',
  仿宋: '"FangSong", "FangSong_GB2312", "STFangsong", serif',
};

function createTextStyle(style: TextStyle, align: 'left' | 'center' | 'justify') {
  return {
    fontFamily: FONT_FAMILY_MAP[style.font],
    fontSize: `${style.size}pt`,
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    textAlign: style.center ? 'center' : align,
    textIndent: style.indent ? '2em' : undefined,
    lineHeight: LINE_HEIGHT,
    margin: 0,
  } as const;
}

const HEADING_STYLE_MAP: Record<number, keyof StyleSettings> = {
  1: 'title',
  2: 'heading1',
  3: 'heading2',
  4: 'heading3',
  5: 'heading4',
};

function renderPhrasing(nodes: PhrasingContent[]): ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return node.value;
      case 'strong':
        return (
          <span key={index} style={{ fontWeight: 'bold' }}>
            {renderPhrasing(node.children)}
          </span>
        );
      case 'emphasis':
        return (
          <span key={index} style={{ fontStyle: 'italic' }}>
            {renderPhrasing(node.children)}
          </span>
        );
      case 'inlineCode':
        return node.value;
      default:
        if ('children' in node && Array.isArray(node.children)) {
          return <span key={index}>{renderPhrasing(node.children as PhrasingContent[])}</span>;
        }
        if ('value' in node && typeof node.value === 'string') {
          return node.value;
        }
        return null;
    }
  });
}

function renderList(
  node: List,
  styles: StyleSettings,
  keyPrefix: string,
  level: number
): ReactNode[] {
  const isOrdered = node.ordered ?? false;
  const startNum = node.start ?? 1;
  const listStyle = createTextStyle(styles.listItem, 'justify');

  return node.children.flatMap((item: ListItem, index) => {
    const prefix = isOrdered ? `${startNum + index}. ` : '• ';
    const items: ReactNode[] = [];

    item.children.forEach((child, childIndex) => {
      if (child.type === 'paragraph') {
        items.push(
          <p
            key={`${keyPrefix}-${index}-${childIndex}`}
            style={{
              ...listStyle,
              marginLeft: level > 0 ? `${level * 2}em` : undefined,
            }}
          >
            {prefix}
            {renderPhrasing(child.children)}
          </p>
        );
      } else if (child.type === 'list') {
        items.push(...renderList(child, styles, `${keyPrefix}-${index}-${childIndex}`, level + 1));
      }
    });

    return items;
  });
}

function renderTable(node: MdTable, styles: StyleSettings, key: string): ReactNode {
  const rows = node.children as MdTableRow[];
  const alignments = node.align || [];

  const headerStyle = {
    ...createTextStyle(styles.tableHeader, 'center'),
    textIndent: undefined,
  };
  const cellStyle = {
    ...createTextStyle(styles.tableCell, 'center'),
    textIndent: undefined,
  };

  const resolveAlign = (alignment: string | null | undefined) => {
    if (alignment === 'left' || alignment === 'right' || alignment === 'center') {
      return alignment;
    }
    return 'center';
  };

  return (
    <table key={key} className="docx-table">
      <tbody>
        {rows.map((row, rowIndex) => {
          const isHeader = rowIndex === 0;
          return (
            <tr key={`${key}-row-${rowIndex}`}>
              {(row.children as MdTableCell[]).map((cell, cellIndex) => {
                const align = resolveAlign(alignments[cellIndex]);
                const content = renderPhrasing(cell.children as PhrasingContent[]);
                return (
                  <td
                    key={`${key}-cell-${rowIndex}-${cellIndex}`}
                    style={{
                      ...(isHeader ? headerStyle : cellStyle),
                      textAlign: align,
                    }}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function DocxPreview({ markdown, styles }: DocxPreviewProps) {
  const ast = useMemo<Root>(() => parseMarkdown(markdown), [markdown]);
  const titleStyle = {
    ...createTextStyle(styles.title, 'left'),
    marginTop: '28pt',
    marginBottom: '28pt',
  };

  const headingStyles = {
    heading1: createTextStyle(styles.heading1, 'left'),
    heading2: createTextStyle(styles.heading2, 'left'),
    heading3: createTextStyle(styles.heading3, 'left'),
    heading4: createTextStyle(styles.heading4, 'left'),
  };
  const bodyStyle = createTextStyle(styles.bodyText, 'justify');

  if (!ast.children.length) {
    return (
      <div className="docx-preview">
        <div className="docx-preview-page">
          <p className="docx-preview-empty">输入内容后显示预览</p>
        </div>
      </div>
    );
  }

  return (
    <div className="docx-preview">
      <div className="docx-preview-page">
        {ast.children.map((node: Content, index) => {
          switch (node.type) {
            case 'heading': {
              const styleKey = HEADING_STYLE_MAP[node.depth] || 'bodyText';
              if (styleKey === 'title') {
                return (
                  <p key={index} style={titleStyle}>
                    {renderPhrasing(node.children)}
                  </p>
                );
              }
              const headingStyle = headingStyles[styleKey as keyof typeof headingStyles];
              return (
                <p key={index} style={headingStyle}>
                  {renderPhrasing(node.children)}
                </p>
              );
            }
            case 'paragraph':
              return (
                <p key={index} style={bodyStyle}>
                  {renderPhrasing(node.children)}
                </p>
              );
            case 'list':
              return renderList(node, styles, `list-${index}`, 0);
            case 'table':
              return renderTable(node as MdTable, styles, `table-${index}`);
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
