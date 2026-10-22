// Owner: Track A. Heading-aware chunking with real overlap (~150 chars), split on word boundaries.
/**
 * Split markdown by headings, then by size with overlap.
 * @returns {{content:string, section_path:string, chunk_index:number, page:number|null}[]}
 */
export function chunkMarkdown(markdown, { maxChars = 1500, overlap = 150, page = null } = {}) {
  const chunks = [];
  const path = [];
  let buf = '';
  const flush = () => {
    const text = buf.trim();
    buf = '';
    // A section that is only a heading carries no answer; its title survives in section_path of the next chunk.
    if (!text || text.split('\n').every((l) => !l.trim() || /^#{1,6}\s/.test(l))) return;
    const section_path = path.filter(Boolean).join(' > ');
    for (let start = 0; start < text.length; ) {
      let end = Math.min(start + maxChars, text.length);
      if (end < text.length) {
        const space = text.lastIndexOf(' ', end);
        if (space > start + maxChars / 2) end = space;
      }
      chunks.push({ content: text.slice(start, end).trim(), section_path, chunk_index: chunks.length, page });
      if (end >= text.length) break;
      const next = text.indexOf(' ', end - overlap);
      start = next > start && next < end ? next + 1 : end - overlap;
    }
  };
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const h = !inFence && /^(#{1,6})\s+(.*)/.exec(line);
    if (h) {
      flush();
      path.length = h[1].length - 1;
      path[h[1].length - 1] = h[2].replace(/#+\s*$/, '').trim();
    }
    buf += line + '\n';
  }
  flush();
  return chunks;
}
