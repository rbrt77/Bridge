// Owner: Track A. TODO(A): port chunkWithOverlap from Internal_ai utils/chunker.js and ADD real ~150 char overlap.
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
    if (!text) return;
    for (let start = 0; start < text.length; start += maxChars - overlap) {
      chunks.push({ content: text.slice(start, start + maxChars), section_path: path.filter(Boolean).join(' > '), chunk_index: chunks.length, page });
      if (start + maxChars >= text.length) break;
    }
    buf = '';
  };
  for (const line of markdown.split('\n')) {
    const h = /^(#{1,6})\s+(.*)/.exec(line);
    if (h) {
      flush();
      path.length = h[1].length - 1;
      path[h[1].length - 1] = h[2].trim();
    }
    buf += line + '\n';
  }
  flush();
  return chunks;
}
