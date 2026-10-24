// XML 1.0 Char: TAB, LF, CR, 0x20..D7FF, E000..FFFD, 10000..10FFFF.
export function filterXmlCharacters(value: string): { text: string; removed: number } {
  let removed = 0;
  let offset = 0;
  let begin = 0;
  let text = '';
  // Iteration yields full code points: valid surrogate pairs survive, isolated surrogates do not.
  for (const character of value) {
    const point = character.codePointAt(0)!;
    const allowed =
      point === 0x9 ||
      point === 0xa ||
      point === 0xd ||
      (point >= 0x20 && point <= 0xd7ff) ||
      (point >= 0xe000 && point <= 0xfffd) ||
      (point >= 0x10000 && point <= 0x10ffff);
    if (!allowed) {
      text += value.slice(begin, offset);
      begin = offset + character.length;
      removed++;
    }
    offset += character.length;
  }
  return { text: removed ? text + value.slice(begin) : value, removed };
}

/** The parsed model is owned by the renderer; count each XML-bound source field once. */
export function filterModelXmlCharacters(model: object): number {
  let removed = 0;
  const visit = (value: object) => {
    for (const [key, child] of Object.entries(value)) {
      // Image filenames are filesystem inputs and never serialized into the XML.
      if (key === 'path') continue;
      if (typeof child === 'string') {
        const filtered = filterXmlCharacters(child);
        (value as Record<string, unknown>)[key] = filtered.text;
        removed += filtered.removed;
      } else if (child && typeof child === 'object') visit(child);
    }
  };
  visit(model);
  return removed;
}
