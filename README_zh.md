# FormalDoc - 公文排版

[![Version](https://img.shields.io/badge/version-1.10.3-blue.svg)](https://github.com/shrektan/formaldoc/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

[English](./README.md)

**FormalDoc** 是一款浏览器端的 Markdown 转 Word 工具，可生成专业排版的 .docx 文件。原本为中国公文格式（GB/T 9704-2012）设计，现已支持多种中英文文档模板。

从豆包、千问、DeepSeek、Kimi、ChatGPT、Claude 等 AI 工具复制文字，粘贴即可一键生成规范的 Word 文档。

## 在线体验

立即使用：[formaldoc.app](https://formaldoc.app)

![截图](docs/screenshot.png)

## 为什么选择 FormalDoc？

### 智能粘贴
从 AI 复制的**富文本自动转换为 Markdown**。标题层级、列表、表格、代码块等格式都能正确识别，无需手动调整。

### 原生 Word 公式
LaTeX 公式转换为**原生可编辑的 Word 公式**（OMML 格式）。可直接在 Microsoft Word 的公式编辑器中修改。

### 规范 Word 样式
生成的 DOCX 文件使用**规范的 Word 样式**，而非硬编码格式。在 Word 中修改样式后，所有相同样式的内容会自动更新。

### 极速生成 & 离线可用
**浏览器本地即时生成** Word 文档。无需服务器处理，无需上传。首次加载后可离线使用。您的文档不会离开您的设备。

### 多模板支持
提供 **8 种专业模板**——4 种中文格式（公文、学术、商务）和 4 种英文格式（标准、商务、学术、法律）。

## 使用方法

1. 从 AI 工具（豆包、千问、DeepSeek、Kimi、ChatGPT、Claude 等）复制文字
2. 粘贴到 FormalDoc（富文本自动转为 Markdown）
3. 选择合适的文档模板
4. 点击"下载 Word 文档"
5. 在 Word 中打开，按需编辑

## 功能特点

| 功能 | 说明 |
|-----|------|
| **智能粘贴** | 从 AI 复制时自动将 HTML 转换为 Markdown |
| **LaTeX 公式** | `$...$` 和 `$$...$$` 转换为原生 Word 公式 |
| **引号转换** | 一键将英文引号转换为中文引号（"..." → "..."） |
| **8 种模板** | 中文公文、学术、商务 + 英文标准、商务、学术、法律 |
| **自定义样式** | 可调整各元素的字体、字号、加粗、斜体 |
| **智能文件名** | 自动从文档标题提取文件名 |
| **多语言界面** | 支持中英文界面 |
| **手机适配** | 响应式设计，支持手机和平板 |
| **命令行工具** | 支持命令行批量处理 |

## 文档模板

FormalDoc 提供 8 种专业文档模板：

### 中文模板

| 模板 | 说明 | 正文字体 | 行距 |
|-----|------|---------|------|
| **cn-gov** | 公文格式（GB/T 9704-2012） | 仿宋 16pt | 固定值 28 磅 |
| **cn-general** | 通用商务文档 | 宋体 12pt | 1.5 倍 |
| **cn-academic** | 论文/期刊格式 | 宋体 12pt | 1.5 倍 |
| **cn-report** | 商务/工作报告 | 宋体 12pt | 1.5 倍 |

### 英文模板

| 模板 | 说明 | 正文字体 | 行距 |
|-----|------|---------|------|
| **en-standard** | 标准格式 | Times New Roman 12pt | 1.5 倍 |
| **en-business** | 现代商务风格 | Calibri 11pt | 1.15 倍 |
| **en-academic** | APA 学术风格 | Times New Roman 12pt | 2 倍（双倍行距） |
| **en-legal** | 合同/法律文书 | Times New Roman 12pt | 1.5 倍 |

### 切换模板

**网页端**：点击顶部的模板选择条或设置按钮，选择需要的模板。

**命令行**：使用 `-t` 或 `--template` 参数：
```bash
formaldoc input.md -o output.docx -t en-standard
```

## 支持的 Markdown 格式

FormalDoc 支持 GitHub Flavored Markdown (GFM) 及 LaTeX 数学公式：

| Markdown 语法 | 说明 | Word 样式 |
|--------------|------|----------|
| `# 标题` | 文档标题 | 标题（居中） |
| `## 标题` | 一级标题 | 标题 1 |
| `### 标题` | 二级标题 | 标题 2 |
| `#### 标题` | 三级标题 | 标题 3 |
| `##### 标题` | 四级标题 | 标题 4 |
| 段落文字 | 正文 | 正文 |
| `**粗体**` | 粗体文字 | 加粗 |
| `*斜体*` | 斜体文字 | 斜体 |
| `~~删除线~~` | 删除线 | 删除线 |
| `[文字](链接)` | 超链接 | 外部链接 |
| `- 列表` / `1. 列表` | 列表（支持嵌套） | 列表段落 |
| `> 引用` | 块引用 | 引用（灰色背景） |
| `` `代码` `` | 行内代码 | 等宽字体 |
| ` ``` ` | 代码块 | 代码块 |
| `\| 表格 \|` | GFM 表格 | 表格样式 |
| `$...$` | 行内公式 | 行内公式 |
| `$$...$$` | 独立公式 | 居中公式 |

### 样式映射（cn-gov 公文模板）

| Markdown | Word 样式 | 字体 |
|----------|----------|------|
| `# 标题` | 公文标题 | 宋体 22pt 加粗居中 |
| `## 标题` | 一级标题 | 黑体 16pt |
| `### 标题` | 二级标题 | 楷体 16pt |
| `#### 标题` | 三级标题 | 仿宋 16pt 加粗 |
| `##### 标题` | 四级标题 | 仿宋 16pt 加粗 |
| 段落 | 正文 | 仿宋 16pt，首行缩进两字符 |
| 列表 | 列表项 | 仿宋 16pt |
| 表格 | 表格 | 仿宋 16pt，居中 |
| 页脚 | - | 仿宋 14pt，"- 1 -" 格式 |

### 样式映射（en-standard 英文模板）

| Markdown | Word 样式 | 字体 |
|----------|----------|------|
| `# 标题` | Title | Arial 20pt 加粗居中 |
| `## 标题` | Heading 1 | Arial 16pt 加粗 |
| `### 标题` | Heading 2 | Arial 14pt 加粗 |
| `#### 标题` | Heading 3 | Arial 12pt 加粗 |
| `##### 标题` | Heading 4 | Arial 12pt 加粗斜体 |
| 段落 | Body Text | Times New Roman 12pt |
| 列表 | List Paragraph | Times New Roman 12pt |
| 表头 | Table Header | Arial 11pt 加粗 |
| 表格单元 | Table Text | Times New Roman 11pt |

## 命令行工具 (CLI)

FormalDoc 提供命令行工具，支持批量处理和自动化。

### 安装

```bash
# 克隆仓库
git clone https://github.com/shrektan/formaldoc.git
cd formaldoc

# 安装依赖
npm install

# 全局链接 CLI
npm run cli:link
```

### 使用方法

```bash
# 基本用法（默认使用 cn-gov 模板）
formaldoc document.md

# 指定输出文件
formaldoc document.md -o output.docx

# 使用其他模板
formaldoc document.md -t en-standard

# 使用自定义样式文件
formaldoc document.md -t cn-gov -s custom-styles.json

# 从标准输入读取
cat document.md | formaldoc --stdin -o output.docx

# 显示帮助
formaldoc --help

# 显示版本
formaldoc --version
```

### 自定义样式 JSON

创建 JSON 文件覆盖默认模板样式：

```json
{
  "title": {
    "font": "Arial",
    "size": 24,
    "bold": true,
    "center": true
  },
  "bodyText": {
    "font": "Times New Roman",
    "size": 12,
    "indent": false
  },
  "heading1": {
    "font": "Arial",
    "size": 18,
    "bold": true
  }
}
```

**可用样式键**：`title`、`heading1`、`heading2`、`heading3`、`heading4`、`bodyText`、`listItem`、`blockquote`、`tableHeader`、`tableCell`、`pageFooter`

**样式属性**：`font`、`size`、`bold`、`italic`、`center`、`indent`

## LaTeX 公式支持

FormalDoc 将 LaTeX 公式转换为原生 Word 公式，可在 Microsoft Word 中直接编辑。

### 语法

- **行内公式**：`$E = mc^2$` 在文本中显示
- **独立公式**：`$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$` 单独一行居中显示

### 支持的功能

- 分数：`\frac{a}{b}`
- 上下标：`x^2`、`x_i`
- 希腊字母：`\alpha`、`\beta`、`\gamma`
- 根号：`\sqrt{x}`、`\sqrt[3]{x}`
- 求和/积分：`\sum_{i=1}^n`、`\int_a^b`
- 矩阵：`\begin{pmatrix}...\end{pmatrix}`
- 更多功能（由 KaTeX 提供支持）

### 转换流程

```
LaTeX → KaTeX (MathML) → mathml2omml (OMML) → Word 公式
```

如果转换失败，公式会保留为纯文本。

## 技术栈

| 库 | 用途 |
|---|------|
| [React 19](https://react.dev/) | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全 |
| [Vite](https://vite.dev/) | 构建工具 |
| [docx](https://docx.js.org/) | Word 文档生成 |
| [unified](https://unifiedjs.com/) + [remark](https://github.com/remarkjs/remark) | Markdown 解析 |
| [remark-gfm](https://github.com/remarkjs/remark-gfm) | GitHub Flavored Markdown |
| [remark-math](https://github.com/remarkjs/remark-math) | LaTeX 公式解析 |
| [Turndown](https://github.com/mixmark-io/turndown) | HTML 转 Markdown |
| [KaTeX](https://katex.org/) | LaTeX 渲染 |
| [mathml2omml](https://www.npmjs.com/package/mathml2omml) | MathML 转 Word 公式 |
| [jsdom](https://github.com/jsdom/jsdom) | CLI 的 DOM 兼容层 |

## 本地开发

### 环境要求

- [Node.js](https://nodejs.org/) 18+ 或 [Bun](https://bun.sh/) 1.0+
- npm 或 bun 包管理器

### 安装

```bash
# 克隆仓库
git clone https://github.com/shrektan/formaldoc.git
cd formaldoc

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 在浏览器中打开 http://localhost:5173
```

### 脚本命令

| 命令 | 说明 |
|-----|------|
| `npm run dev` | 启动开发服务器（支持热更新） |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run format` | 使用 Prettier 格式化代码 |
| `npm run lint` | 检查代码规范 |
| `npm run lint:fix` | 自动修复代码规范问题 |
| `npm run test` | 运行所有测试（约 20 秒） |
| `npm run test:fast` | 仅运行单元测试（约 1.5 秒） |
| `npm run test:watch` | 监听模式运行测试 |

### 测试

```bash
# 运行所有测试（包含 CLI 集成测试）
npm run test

# 仅运行快速单元测试（开发时推荐）
npm run test:fast

# 监听模式
npm run test:watch
```

**注意**：CLI 测试（`cli/cli.test.ts`）较慢（约 19 秒），因为需要启动子进程。开发时建议使用 `test:fast` 获取快速反馈。

### 代码质量

提交前请确保代码通过所有检查：

```bash
npm run format      # Prettier 格式化
npm run lint:fix    # 修复代码规范问题
npm run build       # 验证构建通过
```

## 项目结构

```
formaldoc/
├── src/
│   ├── App.tsx                 # 主应用组件
│   ├── main.tsx                # React 入口
│   ├── components/             # React 组件
│   │   ├── Editor/             # Markdown 编辑器（支持粘贴处理）
│   │   ├── TemplateStrip/      # 模板选择条
│   │   ├── TemplateGallery/    # 模板画廊弹窗
│   │   ├── StyleSettings/      # 样式自定义抽屉
│   │   ├── Toolbar/            # 操作按钮
│   │   └── LoadingOverlay/     # 加载动画
│   ├── hooks/                  # 自定义 React Hooks
│   │   ├── useDocxGenerator.ts # 文档生成 Hook
│   │   └── useTranslation.ts   # 国际化 Hook
│   ├── contexts/               # React Context
│   │   ├── StyleContext.tsx    # 样式状态管理
│   │   └── LanguageContext.tsx # 语言状态管理
│   ├── lib/                    # 核心库
│   │   ├── markdown/           # Markdown 解析
│   │   ├── docx/               # Word 文档生成
│   │   ├── math/               # LaTeX 转 Word 公式
│   │   ├── styles/             # 模板和样式定义
│   │   └── html-to-markdown.ts # HTML 转换
│   ├── types/                  # TypeScript 类型定义
│   ├── i18n/                   # 翻译和示例文本
│   └── styles/                 # CSS 样式
├── cli/                        # 命令行工具
│   ├── index.ts                # CLI 入口
│   ├── dom-polyfill.ts         # Node.js DOM 兼容层
│   └── cli.test.ts             # CLI 集成测试
├── docs/                       # 文档资源
├── package.json                # 依赖和脚本
└── README.md                   # 英文文档
```

## 架构设计

### 转换流程

```
┌─────────────────┐
│  用户输入       │  （从 AI 粘贴 / 输入 Markdown）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  智能粘贴       │  （HTML → Markdown，使用 Turndown）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Markdown       │  （用户在文本框中编辑）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  解析器         │  （remark + remark-gfm + remark-math）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  mdast AST      │  （Markdown 抽象语法树）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  转换器         │  （mdast → docx 元素）
│                 │  - 标题 → Word 样式
│                 │  - 段落 → 正文
│                 │  - 列表 → 嵌套列表
│                 │  - 表格 → Word 表格
│                 │  - 公式 → OMML 公式
│                 │  - 链接 → 超链接
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  docx Document  │  （带样式的文档对象）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Packer         │  （序列化为二进制）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  .docx 文件     │  （通过 FileSaver 下载）
└─────────────────┘
```

### 关键设计决策

1. **纯客户端**：所有处理都在浏览器中完成。无服务器、无上传、完全隐私。

2. **样式优先**：文档使用规范的 Word 样式，而非硬编码格式，便于在 Word 中修改。

3. **原生公式**：LaTeX 转换为 OMML（Word 公式格式），而非图片或 MathML。

4. **字体引用**：字体通过名称引用而非嵌入。文件体积小，但需要用户系统安装相应字体。

5. **模板驱动**：预定义模板确保专业排版，无需手动配置。

## 参与贡献

欢迎贡献代码！提交 Pull Request 前请确保代码通过检查和测试。

```bash
npm run format
npm run lint:fix
npm run test
npm run build
```

## 开源协议

[Apache-2.0](LICENSE)

---

**FormalDoc** — Markdown → Word，一键生成。

无需登录 · 无需安装 · 可离线使用 · 数据不上传
