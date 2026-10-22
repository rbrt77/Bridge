// Owner: Track B (F8 UI). Mermaid lazy-loaded; ALWAYS shows the text outline. Invalid mermaid → outline only.
import { useEffect, useId, useState } from 'react';

export default function Diagram({ title, summary, mermaid: source, outline = [] }) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({ startOnLoad: false, theme: 'base', securityLevel: 'strict' }); // TODO(B): high-contrast theme vars
        await mermaid.parse(source);
        const { svg } = await mermaid.render(`d${id}`, source);
        if (alive) setSvg(svg);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, [source, id]);

  return (
    <figure aria-labelledby={`${id}-t`} className="my-4">
      <figcaption id={`${id}-t`} className="font-semibold">{title}</figcaption>
      {svg && !failed && (
        // TODO(B): inject <title>/<desc> into the svg, add "Download SVG"
        <div role="img" aria-label={`${title}. ${summary}`} dangerouslySetInnerHTML={{ __html: svg }} />
      )}
      <h3 className="mt-2 font-semibold">Text version</h3>
      <ol className="list-none">{outline.map((o) => <li key={o}>{o}</li>)}</ol>
    </figure>
  );
}
