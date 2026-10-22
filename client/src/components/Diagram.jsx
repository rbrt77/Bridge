// Owner: Track B (F8 UI). Mermaid lazy-loaded; ALWAYS shows the text outline. Invalid mermaid → outline only.
// Colours come from the app tokens (so high contrast applies), the SVG carries its own <title>/<desc>, and it downloads as a file.
import { useEffect, useId, useRef, useState } from 'react';

const SVG_NS = 'http://www.w3.org/2000/svg';
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'diagram';

// Re-render when the user switches contrast in Work style (ProfileProvider sets data-contrast on <html>).
function useContrast() {
  const [contrast, setContrast] = useState(() => document.documentElement.dataset.contrast);
  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() => setContrast(root.dataset.contrast));
    obs.observe(root, { attributes: true, attributeFilter: ['data-contrast'] });
    return () => obs.disconnect();
  }, []);
  return contrast;
}

function themeVariables() {
  const [fg, surface, accent, soft, font] = ['--fg', '--surface', '--accent', '--accent-soft', '--font-body'].map(css);
  return {
    background: surface, fontFamily: font, fontSize: '16px',
    primaryColor: soft, primaryTextColor: fg, primaryBorderColor: accent, mainBkg: soft, nodeBorder: accent, nodeTextColor: fg,
    secondaryColor: surface, tertiaryColor: surface, lineColor: fg, textColor: fg,
    edgeLabelBackground: surface, clusterBkg: surface, clusterBorder: fg,
    actorBkg: soft, actorBorder: accent, actorTextColor: fg, actorLineColor: fg,
    signalColor: fg, signalTextColor: fg, labelBoxBkgColor: soft, labelBoxBorderColor: accent, labelTextColor: fg,
    noteBkgColor: surface, noteBorderColor: fg, noteTextColor: fg,
  };
}

/** Mermaid SVG → standalone, labelled SVG string: role="img" named by its own <title>, described by <desc>. */
function labelSvg(raw, { id, title, summary, background }) {
  const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.nodeName !== 'svg') throw new Error('not an svg');
  svg.querySelectorAll(':scope > title, :scope > desc').forEach((n) => n.remove());
  const t = doc.createElementNS(SVG_NS, 'title');
  t.id = `${id}-svg-t`;
  t.textContent = title;
  const d = doc.createElementNS(SVG_NS, 'desc');
  d.id = `${id}-svg-d`;
  d.textContent = summary;
  svg.prepend(t, d);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-labelledby', t.id);
  svg.setAttribute('aria-describedby', d.id);
  svg.removeAttribute('aria-roledescription');
  svg.setAttribute('xmlns', SVG_NS);
  svg.style.backgroundColor = background; // the downloaded file keeps a readable background
  // Natural size, allowed to shrink to fit but never below 36rem: on a phone the box scrolls sideways
  // instead of shrinking the labels to nothing.
  const [, , vw, vh] = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
  if (vw && vh) {
    svg.setAttribute('width', String(Math.ceil(vw)));
    svg.setAttribute('height', String(Math.ceil(vh)));
    svg.style.setProperty('max-width', '100%');
    svg.style.setProperty('min-width', `min(${Math.ceil(vw)}px, 36rem)`);
  }
  return new XMLSerializer().serializeToString(svg);
}

/**
 * @param {{ title: string, summary: string, mermaid: string, outline?: string[], headingLevel?: number }} props
 */
export default function Diagram({ title, summary, mermaid: source, outline = [], headingLevel = 3 }) {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const contrast = useContrast();
  const [svg, setSvg] = useState(null);
  const [failed, setFailed] = useState(false);
  const box = useRef(null);
  const [scrolls, setScrolls] = useState(false);
  const H = `h${Math.min(headingLevel, 6)}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false, securityLevel: 'strict', theme: 'base', themeVariables: themeVariables(),
          themeCSS: '.node rect, .node polygon, .node circle, .actor { stroke-width: 2px; } .flowchart-link { stroke-width: 2px; }',
          htmlLabels: false, flowchart: { htmlLabels: false }, // plain SVG text: readable in the downloaded file and by other tools
        });
        await mermaid.parse(source);
        const { svg: raw } = await mermaid.render(`d${id}`, source);
        if (alive) {
          setSvg(labelSvg(raw, { id, title, summary, background: css('--surface') }));
          setFailed(false);
        }
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, [source, id, title, summary, contrast]);

  // A box that scrolls must be reachable by keyboard (arrow keys scroll it once focused).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const check = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [svg]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`], { type: 'image/svg+xml' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${slug(title)}.svg` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <figure aria-labelledby={`${id}-t`} className="my-2">
      <figcaption id={`${id}-t`} className="text-lg font-semibold">{title}</figcaption>
      {summary && <p className="text-muted">{summary}</p>}

      {svg && !failed && (
        <>
          <div
            ref={box}
            {...(scrolls && { tabIndex: 0, role: 'region', 'aria-label': `${title}, scrolls sideways` })}
            className="mt-3 overflow-x-auto rounded-xl border border-border-subtle bg-surface p-3"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          {scrolls && <p className="mt-1 text-sm text-muted">Wider than the screen: scroll sideways, or read the text version.</p>}
        </>
      )}
      {failed && <p className="mt-3 rounded-lg bg-accent-soft p-3">The picture could not be drawn this time. Everything it would show is in the text version below.</p>}
      {!svg && !failed && <p className="mt-3 text-muted">Drawing…</p>}

      <H className="mt-4 font-semibold">Text version</H>
      <ol className="mt-1 list-none space-y-1">{outline.map((o) => <li key={o}>{o}</li>)}</ol>

      {svg && !failed && (
        <button type="button" onClick={download} className="btn mt-3">
          Download SVG<span className="sr-only">: {title}</span>
        </button>
      )}
    </figure>
  );
}
