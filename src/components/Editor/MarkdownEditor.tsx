import MDEditor, { commands } from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onPaste?: (html: string) => string | null;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, onPaste, placeholder }: MarkdownEditorProps) {
  const handleChange = (val: string | undefined) => {
    onChange(val || '');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!onPaste) return;

    const html = e.clipboardData.getData('text/html');
    if (html) {
      const markdown = onPaste(html);
      if (markdown !== null) {
        e.preventDefault();
        onChange(markdown);
      }
    }
  };

  // Custom toolbar with commonly used commands
  const extraCommands = [commands.codeEdit, commands.codeLive, commands.codePreview];

  return (
    <div className="editor-container" data-color-mode="light" onPaste={handlePaste}>
      <MDEditor
        value={value}
        onChange={handleChange}
        height="100%"
        preview="preview"
        hideToolbar={false}
        enableScroll={true}
        extraCommands={extraCommands}
        textareaProps={{
          placeholder: placeholder,
        }}
      />
    </div>
  );
}
