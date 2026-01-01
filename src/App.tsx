import { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { StyleDrawer } from './components/StyleSettings';
import { StyleProvider, useStyles } from './contexts/StyleContext';
import { useDocxGenerator } from './hooks/useDocxGenerator';
import './styles/app.css';

const EXAMPLE_TEXT = `# 关于开展XX工作的通知

## 一、工作背景

根据上级部门要求，为进一步做好相关工作，现将有关事项通知如下。

## 二、主要任务

### （一）加强组织领导

各单位要高度重视，切实加强组织领导，确保各项工作落实到位。主要做好以下工作：

1. 成立工作领导小组，明确分管领导
2. 建立定期会议制度，及时研究解决问题
3. 加强督导检查，确保工作落实

### （二）明确工作要求

建立健全工作机制，明确责任分工，确保工作有序推进。重点关注：

- 完善制度建设
- 强化人员培训
- 加强信息报送

#### 1. 制度建设方面

各单位要结合实际，制定具体实施方案，明确目标任务、工作措施和完成时限。

#### 2. 人员培训方面

组织开展业务培训，提升工作人员专业能力和服务水平。

## 三、工作安排

| 阶段 | 时间 | 工作内容 |
|:-----|:----:|:---------|
| 第一阶段 | 1-3月 | 制定方案，动员部署 |
| 第二阶段 | 4-9月 | 全面实施，重点推进 |
| 第三阶段 | 10-12月 | 总结评估，巩固提升 |

## 四、工作要求

请各单位认真贯彻落实，如有问题及时反馈。`;

function AppContent() {
  const [text, setText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { styles } = useStyles();
  const { generate, isGenerating, error } = useDocxGenerator();

  const handleGenerate = () => {
    generate(text, styles);
  };

  const handleLoadExample = () => {
    setText(EXAMPLE_TEXT);
  };

  return (
    <div className="app-simple">
      {/* Header */}
      <header className="header-simple">
        <h1>AI文字 → 公文Word</h1>
        <p className="tagline">把豆包、千问、DeepSeek、Kimi、ChatGPT生成的文字，一键转成公文格式Word文档</p>
        <p className="tip">提示：让AI"用Markdown格式回复"，可正确识别标题层级</p>
      </header>

      {/* Main content */}
      <main className="main-simple">
        {/* Textarea */}
        <div className="input-section">
          <div className="input-header">
            <label htmlFor="content">粘贴AI生成的文字</label>
            <button className="example-btn" onClick={handleLoadExample} type="button">
              查看示例
            </button>
          </div>
          <textarea
            id="content"
            className="content-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="在这里粘贴从豆包、千问、DeepSeek、Kimi、ChatGPT等AI工具复制的文字...

支持 Markdown 格式：
# 标题
## 一级标题
### 二级标题
- 列表
**粗体**"
          />
        </div>

        {/* Error message */}
        {error && <div className="error-msg">{error}</div>}

        {/* Generate button */}
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={!text.trim() || isGenerating}
        >
          {isGenerating ? '生成中...' : '生成公文文档'}
        </button>

        {/* Settings link */}
        <button className="settings-link" onClick={() => setIsSettingsOpen(true)} type="button">
          调整字体样式
        </button>
      </main>

      {/* Footer */}
      <footer className="footer-simple">
        <p>无需登录 · 无需安装 · 数据不上传</p>
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
