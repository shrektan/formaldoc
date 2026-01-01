# FormalDoc - 公文排版

[![Version](https://img.shields.io/badge/version-1.1.2-blue.svg)](https://github.com/shrektan/formaldoc/releases)

[English](./README.md)

**FormalDoc** 把AI生成的文字一键转换成公文格式的Word文档。

从豆包、千问、DeepSeek、Kimi、ChatGPT等AI工具复制文字，粘贴即可生成规范的公文Word文档。

## 在线体验

立即使用：[formaldoc.app](https://formaldoc.app)

![截图](docs/screenshot.png)

## 为什么选择 FormalDoc？

### 简单易用

直接粘贴，一键生成。从AI复制的**富文本自动转换为Markdown**，无需手动调整格式。标题层级、列表、表格都能正确识别。

### 极速生成

**浏览器本地即时生成**Word文档。无需服务器处理，无需等待上传下载。

### 开箱即用

**公文格式（GB/T 9704-2012）已预设好**，字体、字号、行距都是标准公文格式。无需任何配置，粘贴即可生成。

### 离线可用 & 隐私安全

**所有处理都在浏览器本地完成**，不会向任何服务器发送数据。首次加载后可离线使用。您的文档不会离开您的设备。

### 可编辑输出

生成的DOCX文件使用**Word样式（样式）**而非硬编码格式。您可以在Word中轻松修改文档——修改样式后，所有相同样式的内容会自动更新。

## 使用方法

1. 从AI工具（豆包、千问、DeepSeek、Kimi、ChatGPT等）复制文字
2. 粘贴到FormalDoc（富文本自动转为Markdown）
3. 点击"下载Word文档"
4. 在Word中打开，按需编辑

## 功能特点

- **智能粘贴**：从AI复制时自动保留标题层级（HTML自动转Markdown）
- **引号转换**：一键将英文引号转换为中文引号（"..." → "..."）
- **自定义样式**：可调整标题、正文、表格等的字体和字号
- **手机适配**：支持手机和平板访问

## 支持的Markdown格式

| Markdown语法 | Word样式 |
|-------------|---------|
| `# 标题` | 公文标题（二号 宋体 加粗 居中）|
| `## 一级标题` | 一级标题（三号 黑体）|
| `### 二级标题` | 二级标题（三号 楷体）|
| `#### 三级标题` | 三级标题（三号 仿宋 加粗）|
| `##### 四级标题` | 四级标题（三号 仿宋 加粗）|
| 段落文字 | 正文（三号 仿宋 首行缩进两字符）|
| 列表 | 列表项（支持嵌套）|
| 表格 | 表格（内容居中）|
| `**粗体**` | 粗体 |
| `*斜体*` | 斜体 |

## 技术栈

- React 19 + TypeScript + Vite
- [docx](https://docx.js.org/) - Word文档生成
- [remark](https://github.com/remarkjs/remark) + [remark-gfm](https://github.com/remarkjs/remark-gfm) - Markdown解析
- [Turndown](https://github.com/mixmark-io/turndown) - HTML转Markdown

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 代码检查和格式化
npm run lint
npm run format
```

## 开源协议

Apache-2.0

---

**FormalDoc** - AI文字 → 公文Word

无需登录 · 无需安装 · 可离线使用 · 数据不上传
