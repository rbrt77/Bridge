// Owner: Track B. Tiny Markdown → React renderer for AI answers (no HTML injection: everything is a React text node).
// Supports what the answer prompt produces: paragraphs, #–### headings, - / 1. lists, ``` code, **bold**, `code`, [text](url), [S#].
// Safe to call on a half-streamed answer: unfinished syntax just shows as text until the rest arrives.

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[S\d+\]|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function inline(text, { cite } = {}) {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i} className="rounded bg-accent-soft px-1 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    const s = /^\[(S\d+)\]$/.exec(part);
    if (s) return cite ? <span key={i}>{cite(s[1])}</span> : part;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noreferrer">{link[1]}<span className="sr-only"> (opens in a new tab)</span></a>;
    return part;
  });
}

/**
 * Splits Markdown into blocks: { type: 'p'|'h'|'ul'|'ol'|'code', level?, text?, start?, items? }.
 * List items are arrays of lines: a line right under an item (or indented after a blank line) belongs to it,
 * so "3. Clone the repo:\n`git clone …`" stays one step and numbering doesn't restart.
 */
export function parseBlocks(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const blocks = [];
  let para = [];
  let afterBlank = false;
  const flush = () => { if (para.length) blocks.push({ type: 'p', text: para.join(' ') }); para = []; };
  const openList = () => {
    const last = blocks.at(-1);
    return !para.length && (last?.type === 'ul' || last?.type === 'ol') && !last.closed ? last : null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      flush();
      const code = [];
      while (++i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i]);
      blocks.push({ type: 'code', text: code.join('\n') });
      afterBlank = false;
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    const list = openList();
    if (!line.trim()) {
      flush();
      afterBlank = true;
      continue;
    }
    if (h) {
      flush();
      blocks.push({ type: 'h', level: h[1].length, text: h[2] });
    } else if (ul || ol) {
      flush();
      const type = ul ? 'ul' : 'ol';
      const text = ul ? ul[1] : ol[2];
      if (list?.type === type) list.items.push([text]);
      else blocks.push({ type, start: ol ? Number(ol[1]) : undefined, items: [[text]] });
    } else if (list && (!afterBlank || /^\s+/.test(line))) {
      list.items.at(-1).push(line.trim());
    } else {
      if (list) list.closed = true;
      para.push(line.trim());
    }
    afterBlank = false;
  }
  flush();
  return blocks;
}

/**
 * @param {{ text: string, headingLevel?: number, cite?: (label: string) => React.ReactNode }} props
 * headingLevel: the level the biggest Markdown heading maps to, so answer headings sit under the page's own h2.
 */
export default function Markdown({ text, headingLevel = 3, cite }) {
  const blocks = parseBlocks(text);
  const top = Math.min(...blocks.filter((b) => b.type === 'h').map((b) => b.level)); // the model may start at ## or ###
  return blocks.map((b, i) => {
    if (b.type === 'h') {
      const Tag = `h${Math.min(6, headingLevel + b.level - top)}`;
      return <Tag key={i} className="mt-4 font-semibold">{inline(b.text, { cite })}</Tag>;
    }
    if (b.type === 'ul' || b.type === 'ol') {
      const List = b.type;
      return (
        <List key={i} start={b.start !== 1 ? b.start : undefined} className={`mt-2 space-y-2 pl-6 ${List === 'ol' ? 'list-decimal' : 'list-disc'}`}>
          {b.items.map((item, j) => (
            <li key={j}>{item.map((l, k) => <span key={k} className={k ? 'mt-1 block' : undefined}>{inline(l, { cite })}</span>)}</li>
          ))}
        </List>
      );
    }
    if (b.type === 'code') return <pre key={i} className="mt-2 rounded-lg bg-accent-soft p-3 font-mono text-sm"><code>{b.text}</code></pre>;
    return <p key={i} className="mt-2 first:mt-0">{inline(b.text, { cite })}</p>;
  });
}

/** Plain text for Listen / copy: no citation labels, no Markdown symbols. */
export function plainText(md) {
  return md
    .replace(/\s*\[S\d+\]/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*`#]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .trim();
}
