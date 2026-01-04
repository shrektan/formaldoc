import katex from 'katex';

export interface MathRenderResult {
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * Renders LaTeX math to PNG image data
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

  // 2. Create temporary container to measure dimensions
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    font-size: 16pt;
    line-height: 1.2;
  `;
  document.body.appendChild(container);

  // Wait for fonts to load
  await document.fonts.ready;

  // 3. Get dimensions with padding
  const rect = container.getBoundingClientRect();
  const scale = 2; // Retina-quality rendering
  const padding = 20;
  const width = Math.ceil(rect.width * scale) + padding * 2;
  const height = Math.ceil(rect.height * scale) + padding * 2;

  // 4. Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // 5. Get computed styles from KaTeX elements
  const katexStyles = getKatexStyles();

  // 6. Create SVG with foreignObject containing the HTML
  const svgData = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <style type="text/css">
          ${katexStyles}
        </style>
      </defs>
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml"
             style="font-size: ${16 * scale}pt; padding: ${padding}px; line-height: 1.2; display: flex; align-items: center; justify-content: center; height: 100%; box-sizing: border-box;">
          ${html}
        </div>
      </foreignObject>
    </svg>
  `;

  // Clean up temporary container
  document.body.removeChild(container);

  // 7. Convert SVG to data URL
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  // 8. Load SVG into image and draw to canvas
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(new Error(`Failed to load math image: ${e}`));
    img.src = url;
  });

  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  // 9. Export as PNG
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return {
    data: bytes,
    width: width / scale,
    height: height / scale,
  };
}

/**
 * Extracts essential KaTeX CSS styles for SVG embedding
 */
function getKatexStyles(): string {
  // Core KaTeX styles needed for rendering
  return `
    .katex {
      font: normal 1.21em KaTeX_Main, Times New Roman, serif;
      text-indent: 0;
      text-rendering: auto;
    }
    .katex * {
      -ms-high-contrast-adjust: none !important;
      border-color: currentColor;
    }
    .katex .katex-mathml {
      position: absolute;
      clip: rect(1px, 1px, 1px, 1px);
      padding: 0;
      border: 0;
      height: 1px;
      width: 1px;
      overflow: hidden;
    }
    .katex .katex-html {
      display: inline-block;
    }
    .katex .base {
      position: relative;
      display: inline-block;
      white-space: nowrap;
    }
    .katex .strut {
      display: inline-block;
    }
    .katex .mord {
      display: inline-block;
    }
    .katex .mop {
      display: inline-block;
    }
    .katex .mbin {
      display: inline-block;
    }
    .katex .mrel {
      display: inline-block;
    }
    .katex .mopen {
      display: inline-block;
    }
    .katex .mclose {
      display: inline-block;
    }
    .katex .mpunct {
      display: inline-block;
    }
    .katex .minner {
      display: inline-block;
    }
    .katex .mfrac {
      display: inline-block;
      text-align: center;
    }
    .katex .mfrac > span {
      display: block;
    }
    .katex .mfrac .frac-line {
      display: inline-block;
      width: 100%;
      border-bottom-style: solid;
    }
    .katex .msupsub {
      text-align: left;
    }
    .katex .msupsub > span {
      display: block;
    }
    .katex .msub > span,
    .katex .msup > span,
    .katex .msupsub > span {
      position: relative;
    }
    .katex .vlist-t {
      display: inline-table;
      table-layout: fixed;
      border-collapse: collapse;
    }
    .katex .vlist-r {
      display: table-row;
    }
    .katex .vlist {
      display: table-cell;
      vertical-align: bottom;
      position: relative;
    }
    .katex .vlist > span {
      display: block;
      height: 0;
      position: relative;
    }
    .katex .vlist > span > span {
      display: inline-block;
    }
    .katex .vlist-s {
      display: table-cell;
      vertical-align: bottom;
      font-size: 1px;
      width: 2em;
    }
    .katex .vlist-t2 {
      margin-right: -2em;
    }
    .katex .sizing,
    .katex .fontsize-ensurer {
      display: inline-block;
    }
    .katex .delimsizing {
      display: inline-block;
    }
    .katex .op-symbol {
      position: relative;
    }
    .katex .op-limits > .vlist-t {
      text-align: center;
    }
    .katex .accent > .vlist-t {
      text-align: center;
    }
    .katex .sqrt {
      display: inline-block;
    }
    .katex .sqrt > .sqrt-sign {
      display: inline-block;
    }
    .katex .sqrt .sqrt-line {
      display: inline-block;
    }
  `;
}
