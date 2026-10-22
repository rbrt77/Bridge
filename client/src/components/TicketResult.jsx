// Owner: Track B (F2 UI). Renders a decoded ticket (docs/API.md TicketDecoded) instead of raw JSON:
// summary → unclear points (Ask my manager) → acceptance criteria → steps → files → DoD → screenshots → sources, + Show as diagram.
// Ticks live in the parent (kept with the ticket in sessionStorage); once saved as a checklist, step ticks also sync to Today.
import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import Checklist from './Checklist.jsx';
import SourceList from './SourceList.jsx';
import HelpChat from './HelpChat.jsx';
import Diagram from './Diagram.jsx';
import GlossaryTerm, { GlossaryText } from './GlossaryTerm.jsx';
import { useGlossary } from '../lib/glossary.js';

function Section({ id, title, children, className = '' }) {
  return (
    <section aria-labelledby={id} className={`card mt-4 ${className}`}>
      <h3 id={id} className="text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Unclear({ items, title, ticketUrl }) {
  const [open, setOpen] = useState(null); // index of the point being asked about
  if (!items.length) return null;
  return (
    <section aria-labelledby="tk-unclear" className="card mt-4 border-2 border-accent">
      <h3 id="tk-unclear" className="text-lg font-semibold">Unclear in this ticket ({items.length})</h3>
      <p className="text-sm text-muted">The ticket doesn&apos;t say. Asking early is normal and saves rework.</p>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((u, i) => (
          <li key={u.question} className="rounded-xl bg-accent-soft p-3">
            <p className="font-medium"><GlossaryText text={u.issue} /></p>
            <p className="mt-1">Question to ask: <q>{u.question}</q></p>
            {open === i ? (
              <HelpChat
                handoff={{ helper: { name: 'your manager' }, draft: `Hi, about ${title}: ${u.question}${ticketUrl ? `\n\nTicket: ${ticketUrl}` : ''}` }}
                question={u.question}
                ticketUrl={ticketUrl}
                headingLevel={4}
                onClose={() => setOpen(null)}
              />
            ) : (
              <button type="button" onClick={() => setOpen(i)} className="btn mt-2">Ask my manager</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShowDiagram({ data }) {
  const [state, setState] = useState({ busy: false, error: '', diagram: null });
  const announce = useAnnounce();
  const make = async () => {
    setState({ busy: true, error: '', diagram: null });
    try {
      const text = [data.summary, ...data.steps.map((s, i) => `${i + 1}. ${s.text}`), ...data.files.map((f) => `${f.path}: ${f.why}`)].join('\n');
      const diagram = await api('/convert/diagram', { method: 'POST', body: { text, kind: 'flowchart' } });
      setState({ busy: false, error: '', diagram });
      announce('Diagram ready. A text version is right below it.');
    } catch (e) {
      setState({ busy: false, error: e.message, diagram: null });
    }
  };
  return (
    <div className="mt-4">
      {!state.diagram && <button type="button" onClick={make} disabled={state.busy} className="btn">{state.busy ? 'Drawing…' : 'Show as diagram'}</button>}
      {state.error && <p role="alert" className="mt-2 text-danger">{state.error}</p>}
      {state.diagram && <div className="card"><Diagram {...state.diagram} /></div>}
    </div>
  );
}

/**
 * @param {{ data: object, sourceUrl: string|null, saved: object|null,
 *   ticks: { criteria: boolean[], steps: boolean[] }, onTicks: (fn: (t) => object) => void }} props
 */
export default function TicketResult({ data, sourceUrl, saved, ticks, onTicks }) {
  const announce = useAnnounce();
  const glossary = useGlossary();
  const criteria = data.acceptance_criteria.map((c, i) => ({ text: c.text, note: c.inferred ? 'inferred' : null, done: !!ticks.criteria[i] }));
  const steps = data.steps.map((s, i) => ({ ...s, done: !!ticks.steps[i] }));
  const setTick = (kind, i, done) => onTicks((t) => {
    const list = [...t[kind]];
    list[i] = done;
    return { ...t, [kind]: list };
  });

  // After "Save as checklist", the saved items (same order) carry ids: ticks are then stored and show in Today.
  const tickStep = async (_, done, i) => {
    setTick('steps', i, done);
    const item = saved?.items?.[i];
    if (!item) return;
    try {
      await api(`/checklists/${saved.id}/items/${item.id}`, { method: 'PATCH', body: { done } });
    } catch (e) {
      setTick('steps', i, !done);
      announce(`Could not save that tick: ${e.message}`, { urgent: true });
    }
  };
  const inferred = data.acceptance_criteria.filter((c) => c.inferred).length;

  return (
    <article aria-labelledby="tk-title" className="mt-6">
      <h2 id="tk-title" className="text-2xl font-bold">{data.title}</h2>
      <p className="mt-2 max-w-prose text-lg"><GlossaryText text={data.summary} /></p>

      <Unclear items={data.unclear ?? []} title={data.title} ticketUrl={sourceUrl} />

      <section aria-labelledby="tk-work" className="card mt-4">
        <h3 id="tk-work" className="sr-only">Checklists</h3>
        <Checklist
          title="Acceptance criteria"
          items={criteria}
          hint={inferred ? `${inferred} inferred: not written in the ticket, check them` : undefined}
          onToggle={(_, done, i) => setTick('criteria', i, done)}
        />
        <Checklist
          title="Steps"
          items={steps}
          hint={saved ? 'saved: ticks show in Today' : 'save as checklist to keep your ticks'}
          onToggle={tickStep}
        />
      </section>

      {data.files?.length > 0 && (
        <Section id="tk-files" title="Files to look at">
          <ul className="mt-2 flex flex-col gap-2">
            {data.files.map((f) => (
              <li key={f.path}>
                <code className="rounded bg-accent-soft px-1.5 font-mono text-sm">{f.path}</code>
                <span className="block text-muted"><GlossaryText text={f.why} /></span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.definition_of_done?.length > 0 && (
        <Section id="tk-dod" title="Done means">
          {glossary.find('DoD') && <p className="text-sm text-muted">From your team&apos;s <GlossaryTerm term="DoD" variant="inline">Definition of Done</GlossaryTerm>.</p>}
          <ul className="mt-2 list-disc pl-6">{data.definition_of_done.map((d) => <li key={d}><GlossaryText text={d} /></li>)}</ul>
        </Section>
      )}

      {data.images?.length > 0 && (
        <Section id="tk-img" title="What the screenshots show">
          <ul className="mt-2 list-disc pl-6">{data.images.map((im) => <li key={im.alt}>{im.alt}</li>)}</ul>
        </Section>
      )}

      {data.sources?.length > 0 && <div className="card mt-4"><SourceList sources={data.sources} idPrefix="tk-src" /></div>}

      <ShowDiagram data={data} />
    </article>
  );
}
