# FormalDoc - 公文排版

[English](./README.md)

**FormalDoc** 把AI生成的文字（Markdown格式）一键转换成公文格式的Word文档。

从豆包、ChatGPT、Kimi等AI工具复制文字，粘贴即可生成规范的公文Word文档。

## 在线体验

立即使用：[formaldoc.vercel.app](https://formaldoc.vercel.app)

## 功能特点

- **Markdown转Word**：支持标题、正文、列表、表格、粗体、斜体
- **公文格式**：遵循 GB/T 9704-2012 党政机关公文格式标准
- **自定义样式**：可调整标题、正文、表格等的字体和字号
- **手机适配**：支持手机和平板访问
- **隐私安全**：所有处理在浏览器完成，不上传任何数据

## 使用方法

1. 从AI工具（豆包、ChatGPT、Kimi等）复制生成的文字
2. 粘贴到FormalDoc
3. 点击"生成公文文档"
4. 下载Word文档

**小技巧**：让AI"用Markdown格式输出"，效果更佳。

## 支持的Markdown格式

| Markdown语法 | 公文样式 |
|-------------|---------|
| `# 标题` | 公文标题（二号 宋体 加粗 居中）|
| `## 一级标题` | 一级标题（三号 黑体）|
| `### 二级标题` | 二级标题（三号 楷体）|
| `#### 三级标题` | 三级标题（三号 仿宋 加粗）|
| `##### 四级标题` | 四级标题（三号 仿宋 加粗）|
| 段落文字 | 正文（三号 仿宋 首行缩进两字符）|
| 列表 | 列表项 |
| 表格 | 表格 |
| `**粗体**` | 粗体 |
| `*斜体*` | 斜体 |

## 技术栈

- React 19 + TypeScript + Vite
- [docx](https://docx.js.org/) - Word文档生成
- [remark](https://github.com/remarkjs/remark) - Markdown解析

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

## 隐私说明

所有处理均在**浏览器本地**完成：

- 不上传任何内容
- 不存储任何数据
- 无服务器处理

您的文档不会离开您的设备。

## 开源协议

Apache-2.0

---

**FormalDoc** - AI文字 → 公文Word

无需登录 · 无需安装 · 数据不上传
