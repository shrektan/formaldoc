import { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { StyleDrawer } from './components/StyleSettings';
import { StyleProvider } from './contexts/StyleContext';
import { useStyles } from './contexts/useStyles';
import { useDocxGenerator } from './hooks/useDocxGenerator';
import { htmlToMarkdown } from './lib/html-to-markdown';
import './styles/app.css';

const EXAMPLE_TEXT = `# 关于XX单位202X年度上半年办公用品采购及使用情况的报告

XX主管部门：

为规范办公用品管理、严控行政成本、保障日常办公有序开展，现将我单位202X年度上半年办公用品采购及使用情况报告如下。

## 一、采购基本情况

上半年，我单位严格执行《XX单位办公用品采购管理办法》，采用"集中采购为主、零星补采为辅"的模式，所有采购均通过合规渠道完成，全程留存采购记录及发票。

### （一）采购批次及金额

| 采购类型 | 采购批次 | 采购物资 | 采购金额（元） | 占总采购额比例 |
|----------|----------|----------|----------------|----------------|
| 集中采购 | 2        | 电脑耗材、打印纸、办公文具等 | 18,500         | 85.9%          |
| 零星补采 | 3        | 应急办公物品、特殊耗材等 | 3,080          | 14.1%          |
| 合计     | 5        | -        | 21,580         | 100%           |

### （二）采购成本对比

与202X年度上半年相比，采购金额减少3,220元，降幅12.9%，主要原因包括：

1. 优化采购方案，通过批量采购降低单价；
2. 减少非必要物资采购，聚焦核心办公需求；
3. 推行绿色办公，压缩耗材采购量。

## 二、使用及管理情况

### （一）领用数据统计

上半年累计领用办公用品420件，其中：

- 消耗品（打印纸、签字笔等）：350件，占比83.3%；
- 非消耗品（文件夹、订书机等）：70件，占比16.7%。

### （二）管理措施

1. 建立《办公用品领用登记台账》，实行"按需申领、限额领用、签字确认"制度；
2. 指定专人负责库存管理，每月盘点一次，确保账物相符；
3. 推进绿色办公，明确要求：
   - 打印文件优先使用双面打印；
   - 鼓励重复利用可回收办公物品（如文件夹、信封）；
   - 杜绝浪费，对违规领用行为进行提醒。

## 三、下一步工作计划

1. 进一步优化采购流程，提前预判办公需求，减少零星补采频次；
2. 加强库存精细化管理，合理控制库存数量，避免积压；
3. 持续强化绿色办公理念，开展节约办公宣传教育，进一步压缩行政成本。

特此报告。

XX单位（盖章）
202X年X月X日`;

const PLACEHOLDER_TEXT = `在这里粘贴从豆包、千问、DeepSeek、Kimi、ChatGPT等AI工具复制的文字...

支持 Markdown 格式：
# 标题
## 一级标题
### 二级标题
- 列表
**粗体**`;

function AppContent() {
  const [text, setText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHeadingHint, setShowHeadingHint] = useState(false);
  const [autoRecognizeLatex, setAutoRecognizeLatex] = useState(true);
  const { styles } = useStyles();
  const { generate, isGenerating, error } = useDocxGenerator();

  // Check if text has markdown headings
  const checkForHeadings = (content: string) => {
    const hasHeadings = /^#{1,2}\s+.+$/m.test(content);
    if (!hasHeadings && content.trim().length > 50) {
      setShowHeadingHint(true);
    }
  };

  const handleGenerate = () => {
    generate(text, styles, { autoRecognizeLatex });
  };

  const handleLoadExample = () => {
    setText(EXAMPLE_TEXT);
    setShowHeadingHint(false);
  };

  const handleConvertQuotes = () => {
    // Convert English double quotes to Chinese double quotes
    // "content" → "content" (U+201C and U+201D)
    let count = 0;
    const converted = text.replace(/"([^"]*)"/g, (_match, content) => {
      count++;
      return '\u201C' + content + '\u201D';
    });
    setText(converted);
    checkForHeadings(converted);
    alert(count > 0 ? `已转换 ${count} 处引号` : '未找到需要转换的英文引号');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    setShowHeadingHint(false); // Reset hint on new paste
    const html = e.clipboardData.getData('text/html');
    if (html) {
      e.preventDefault();
      const markdown = htmlToMarkdown(html);
      setText(markdown);
      checkForHeadings(markdown);
    }
    // If no HTML, let default paste behavior handle plain text.
  };

  return (
    <div className="app-simple">
      {/* Header */}
      <header className="header-simple">
        <div className="header-title">
          <img src="/logo.png" alt="FormalDoc Logo" className="logo" />
          <h1>AI文字 → 公文Word</h1>
          <a
            href="https://github.com/shrektan/formaldoc"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            title="GitHub"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
        <p className="tagline">
          把豆包、千问、DeepSeek、Kimi、ChatGPT生成的文字，一键转成公文格式Word文档
        </p>
        <p className="tip">提示：让AI"用Markdown格式回复"，可正确识别标题层级</p>
      </header>

      {/* Main content */}
      <main className="main-simple">
        {/* Textarea */}
        <div className="input-section">
          <div className="input-header">
            <label htmlFor="content">粘贴AI生成的文字</label>
            <div className="input-actions">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoRecognizeLatex}
                  onChange={(e) => setAutoRecognizeLatex(e.target.checked)}
                />
                自动识别公式
              </label>
              <button
                className="action-btn"
                onClick={handleConvertQuotes}
                type="button"
                disabled={!text.trim()}
              >
                引号转换
              </button>
              <button className="action-btn" onClick={() => setIsSettingsOpen(true)} type="button">
                字体样式
              </button>
              <button className="action-btn" onClick={handleLoadExample} type="button">
                示例
              </button>
            </div>
          </div>
          <textarea
            id="content"
            className="content-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              checkForHeadings(e.target.value);
            }}
            onPaste={handlePaste}
            placeholder={PLACEHOLDER_TEXT}
          />
          {/* Heading hint for mobile users */}
          {showHeadingHint && (
            <div className="heading-hint">
              <span>未检测到标题格式。可让AI"把内容放在markdown代码块中"再复制。</span>
              <button
                type="button"
                className="hint-close"
                onClick={() => setShowHeadingHint(false)}
                aria-label="关闭提示"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && <div className="error-msg">{error}</div>}

        {/* Generate button */}
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={!text.trim() || isGenerating}
          type="button"
        >
          {isGenerating ? '生成中...' : '下载Word文档'}
        </button>
      </main>

      {/* Footer */}
      <footer className="footer-simple">
        <p>无需登录 · 无需安装 · 可离线使用 · 数据不上传</p>
        <p className="version">v{__APP_VERSION__}</p>
      </footer>

      {/* Settings drawer */}
      <StyleDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <StyleProvider>
      <AppContent />
      <Analytics />
    </StyleProvider>
  );
}

export default App;
