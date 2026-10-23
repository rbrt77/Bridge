// Owner: Track B (page) + Track D (content). AI Act art. 50 transparency page.
import { Link } from 'react-router';

const MODELS = [
  ['Answers, ticket and review explanations, meeting tasks, letters', 'OpenAI gpt-5-mini'],
  ['Search: rewriting your question, ranking the best passages', 'OpenAI gpt-4.1-mini'],
  ['Background work: glossary, short summaries of documents', 'OpenAI gpt-5-nano'],
  ['Finding the right passages in team documents', 'OpenAI text-embedding-3-small'],
  ['Meeting recordings to text, with who said what', 'ElevenLabs Scribe v2'],
  ['Listen and dictate when your browser cannot', 'OpenAI gpt-4o-mini-tts and gpt-4o-mini-transcribe'],
];

const KEPT = [
  'Your work style settings (text size, contrast, answer length, steps, reading speed).',
  'Checklists you save from a ticket, and the tasks, decisions and summary from a meeting.',
  'Messages you send to your manager, and answers your manager saves to the team docs.',
  'Anonymous questions, without your name or account. Only you can check the answer, with a code kept in your browser.',
];

const NEVER = [
  'A diagnosis or any health information. Bridge never asks for it.',
  'The free text you type to set up your work style: it is turned into settings and thrown away.',
  'Meeting recordings and transcripts. Only your tasks, the decisions and the summary are kept.',
  'Your choices and letter on the Support page, unless you send the letter yourself.',
  'Who asked an anonymous question.',
];

const LIMITS = [
  'Bridge answers only from your team’s documents. Every answer shows its sources, so you can check them.',
  'When the documents do not say something, Bridge says so and offers to ask a person. It does not guess.',
  'AI can still be wrong. If an answer matters, open the source or ask your manager.',
  'Nothing is sent to your manager or your team unless you press Send.',
];

const NOT_DONE = [
  'It does not monitor, score or rank employees.',
  'It does not recognise emotions or judge tone in meetings or reviews.',
  'It does not decide anything about hiring, promotion or tasks: people do.',
  'Managers see team themes only for groups of 5 questions or more, never who asked. Demo data is marked as seed data.',
];

function List({ items }) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-6">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export default function AboutAi() {
  return (
    <>
      <h1 className="text-3xl font-bold">About the AI</h1>
      <p className="mt-2 max-w-prose text-muted">
        Bridge uses AI to explain your team’s documents, tickets, reviews and meetings. Everything marked “AI-generated” on a page was
        written by an AI system. This page says which systems we use, what we keep and what we never keep.
      </p>

      <section aria-labelledby="models-h" className="card mt-6">
        <h2 id="models-h" className="text-xl font-semibold">Which AI systems we use</h2>
        <table className="mt-3 w-full text-left">
          <caption className="sr-only">AI systems and what they are used for</caption>
          <thead>
            <tr>
              <th scope="col" className="py-2 pr-4">What for</th>
              <th scope="col" className="py-2">System</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map(([what, model]) => (
              <tr key={what} className="border-t border-[var(--border-subtle)]">
                <td className="py-2 pr-4">{what}</td>
                <td className="py-2">{model}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm text-muted">
          When possible, reading aloud and dictation run in your browser and nothing leaves your device. Text and audio sent to these
          systems are used only to answer your request.
        </p>
      </section>

      <section aria-labelledby="limits-h" className="card mt-6">
        <h2 id="limits-h" className="text-xl font-semibold">How answers work</h2>
        <List items={LIMITS} />
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="kept-h" className="card">
          <h2 id="kept-h" className="text-xl font-semibold">What we keep</h2>
          <List items={KEPT} />
          <p className="mt-3 text-sm text-muted">Stored in the EU (Supabase, Frankfurt). You can export or delete your work style any time.</p>
        </section>
        <section aria-labelledby="never-h" className="card">
          <h2 id="never-h" className="text-xl font-semibold">What we never keep</h2>
          <List items={NEVER} />
        </section>
      </div>

      <section aria-labelledby="not-h" className="card mt-6">
        <h2 id="not-h" className="text-xl font-semibold">What Bridge does not do</h2>
        <List items={NOT_DONE} />
      </section>

      <section aria-labelledby="law-h" className="card mt-6">
        <h2 id="law-h" className="text-xl font-semibold">Why we tell you this</h2>
        <p className="mt-2 max-w-prose">
          The EU AI Act asks that people know when they are dealing with an AI system and when content is AI-generated (Article 50). It also
          forbids emotion recognition at work (Article 5). Health information is a special category under the GDPR (Article 9), so Bridge
          is built to work without it.
        </p>
        <p className="mt-2 max-w-prose">
          Parts of the server (sign-in, document upload and search) are adapted from our team’s earlier project, Internal_ai. Questions or
          problems? Use <Link to="/ask">Ask</Link> to write to your manager.
        </p>
      </section>
    </>
  );
}
