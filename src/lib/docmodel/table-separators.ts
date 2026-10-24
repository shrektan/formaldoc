/** Adjacent Word tables merge unless an actual paragraph separates them, including inside cells. */
export function separateAdjacentTables(content: string): string {
  const separator =
    '<w:p><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
  return content.replace(/<\/w:tbl>\s*(?=<w:tbl\b)/g, `</w:tbl>${separator}`);
}
