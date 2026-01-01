import { useState } from 'react';
import { MarkdownEditor } from './components/Editor/MarkdownEditor';
import { Toolbar } from './components/Toolbar/Toolbar';
import { useDocxGenerator } from './hooks/useDocxGenerator';
import './styles/app.css';

function App() {
  const [markdown, setMarkdown] = useState('');
  const { generate, isGenerating, error } = useDocxGenerator();

  const handleGenerate = () => {
    generate(markdown);
  };

  return (
    <div className="app">
      <Toolbar
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        disabled={!markdown.trim()}
      />
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}
      <main className="main-content">
        <MarkdownEditor
          value={markdown}
          onChange={setMarkdown}
        />
      </main>
      <footer className="footer">
        <p>All processing happens in your browser. No data is uploaded.</p>
      </footer>
    </div>
  );
}

export default App;
