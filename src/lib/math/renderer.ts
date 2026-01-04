import katex from 'katex';
import html2canvas from 'html2canvas';

export interface MathRenderResult {
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * Renders LaTeX math to PNG image data
 * Uses html2canvas to safely render KaTeX HTML to canvas without security issues
 * @param latex - The LaTeX string (without $$ delimiters)
 * @returns PNG image data and dimensions
 */
export async function renderMathToPng(latex: string): Promise<MathRenderResult> {
  // 1. Render LaTeX to HTML using KaTeX
  const html = katex.renderToString(latex, {
    displayMode: true,
    throwOnError: false,
    output: 'html',
  });

  // 2. Create temporary container for rendering
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    font-size: 16pt;
    line-height: 1.2;
    padding: 10px;
    background: white;
  `;
  document.body.appendChild(container);

  // Wait for fonts to load
  await document.fonts.ready;

  // 3. Use html2canvas to render to canvas
  // html2canvas handles the rendering internally without foreignObject
  // This avoids the "The operation is insecure" error
  const canvas = await html2canvas(container, {
    backgroundColor: '#ffffff',
    scale: 2, // Retina-quality rendering
    logging: false,
    useCORS: true,
  });

  // Clean up temporary container
  document.body.removeChild(container);

  // 4. Get dimensions
  const scale = 2;
  const width = canvas.width / scale;
  const height = canvas.height / scale;

  // 5. Export as PNG
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return {
    data: bytes,
    width,
    height,
  };
}
