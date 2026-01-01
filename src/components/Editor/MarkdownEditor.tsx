import MDEditor from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const DEFAULT_CONTENT = `# 关于XX工作的通知

## 一、工作背景

这是正文内容。根据相关规定，现就有关事项通知如下。

### （一）总体要求

坚持以习近平新时代中国特色社会主义思想为指导，全面贯彻落实党的二十大精神。

### （二）主要目标

到2025年底，基本建立完善的工作机制。

## 二、重点任务

#### 1. 加强组织领导

各单位要高度重视，切实加强组织领导，确保各项工作落实到位。

##### （1）明确责任分工

建立健全工作责任制，明确各级各部门职责。

##### （2）强化督导检查

定期开展督导检查，及时发现和解决问题。

#### 2. 完善工作机制

建立健全长效工作机制，确保工作规范有序开展。

## 三、工作要求

各单位要认真贯彻落实本通知精神，结合实际制定具体措施。

---

**支持的格式：**
- # 标题（公文标题）
- ## 一级标题（一、二、三）
- ### 二级标题（（一）（二））
- #### 三级标题（1. 2. 3.）
- ##### 四级标题（（1）（2））
- 正文段落
- **粗体** 和 *斜体*
- 列表
- 表格

| 项目 | 数量 | 备注 |
|:-----|:----:|-----:|
| 示例A | 10 | 左对齐 |
| 示例B | 20 | 右对齐 |`;

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const handleChange = (val: string | undefined) => {
    onChange(val || '');
  };

  return (
    <div className="editor-container" data-color-mode="light">
      <MDEditor
        value={value || DEFAULT_CONTENT}
        onChange={handleChange}
        height="100%"
        preview="edit"
        hideToolbar={false}
        enableScroll={true}
      />
    </div>
  );
}

export { DEFAULT_CONTENT };
