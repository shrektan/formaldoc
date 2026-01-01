import { useState } from 'react';
import { MarkdownEditor, DEFAULT_CONTENT } from './components/Editor/MarkdownEditor';
import { Toolbar } from './components/Toolbar/Toolbar';
import { StyleDrawer } from './components/StyleSettings';
import { StyleProvider, useStyles } from './contexts/StyleContext';
import { useDocxGenerator } from './hooks/useDocxGenerator';
import './styles/app.css';

function AppContent() {
  const [markdown, setMarkdown] = useState(DEFAULT_CONTENT);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { styles } = useStyles();
  const { generate, isGenerating, error } = useDocxGenerator();

  const handleGenerate = () => {
    generate(markdown, styles);
  };

  return (
    <div className="app">
      <Toolbar
        onGenerate={handleGenerate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isGenerating={isGenerating}
        disabled={!markdown.trim()}
      />
      {error && <div className="error-banner">{error}</div>}
      <main className="main-content">
        <MarkdownEditor value={markdown} onChange={setMarkdown} />
      </main>
      <footer className="footer">
        <p>所有处理均在浏览器中完成，不会上传任何数据。</p>
      </footer>
      <StyleDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <StyleProvider>
      <AppContent />
    </StyleProvider>
  );
}

export default App;
