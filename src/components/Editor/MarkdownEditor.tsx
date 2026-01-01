interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const DEFAULT_PLACEHOLDER = `# 文档标题

## 一、第一章

这是正文内容。使用仿宋体排版。

### （一）第一节

这是第一节的内容。

### （二）第二节

这是第二节的内容。

## 二、第二章

更多内容...

---

支持的格式：
- 标题 (# ## ### ####)
- 段落
- 有序列表 (1. 2. 3.)
- 无序列表 (- item)
- **粗体** 和 *斜体*`;

export function MarkdownEditor({ value, onChange, placeholder = DEFAULT_PLACEHOLDER }: MarkdownEditorProps) {
  return (
    <div className="editor-container">
      <textarea
        className="markdown-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
      />
    </div>
  );
}
