import { useState } from 'react';
import { MarkdownEditor, DEFAULT_CONTENT } from './components/Editor/MarkdownEditor';
import { Toolbar } from './components/Toolbar/Toolbar';
import { DocxPreview } from './components/Preview/DocxPreview';
import { useDocxGenerator } from './hooks/useDocxGenerator';
import './styles/app.css';

function App() {
  const [markdown, setMarkdown] = useState(DEFAULT_CONTENT);
  const { preview, download, previewBlob, isGenerating, error } = useDocxGenerator();

  const handlePreview = () => {
    preview(markdown);
  };

  const handleDownload = () => {
    download();
  };

  return (
    <div className="app">
      <Toolbar
        onPreview={handlePreview}
        onDownload={handleDownload}
        isGenerating={isGenerating}
        hasPreview={!!previewBlob}
        disabled={!markdown.trim()}
      />
      {error && <div className="error-banner">{error}</div>}
      <main className="main-content">
        <div className="editor-panel">
          <div className="panel-header">Markdown</div>
          <MarkdownEditor value={markdown} onChange={setMarkdown} />
        </div>
        <div className="preview-panel">
          <div className="panel-header">Preview</div>
          <DocxPreview docxBlob={previewBlob} />
        </div>
      </main>
      <footer className="footer">
        <p>All processing happens in your browser. No data is uploaded.</p>
      </footer>
    </div>
  );
}

export default App;
