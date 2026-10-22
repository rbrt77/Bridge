// Owner: Track B (F1). 5 questions about HOW you work (never a diagnosis) + quick starts + display/output settings.
import { useProfile } from '../a11y/ProfileProvider.jsx';
import Todo from '../components/Todo.jsx';

const QUICK_STARTS = ['Written-first', 'Step-by-step', 'Listen-first', 'Visual-first', 'Screen-reader mode', 'Calm mode', 'Keyboard & voice'];

export default function WorkStyle() {
  const { prefs, setPrefs, reset } = useProfile();
  const setDisplay = (k, v) => setPrefs((p) => ({ ...p, display: { ...p.display, [k]: v } }));
  return (
    <>
      <h1 className="text-2xl font-bold">Your work style</h1>
      <p>Saved on this device only. Nothing here is shared with your manager.</p>
      <Todo owner="B">Wizard (tasks, meetings, code review, team communication, display & input) + optional free text → POST /api/profile/parse → confirm. Map quick starts to prefs. Export / Delete buttons. Optional sync (PUT /api/profile).</Todo>
      <h2 className="mt-4 font-semibold">Quick starts</h2>
      <ul className="flex flex-wrap gap-2">{QUICK_STARTS.map((q) => <li key={q}><button type="button" className="rounded border px-3">{q}</button></li>)}</ul>
      <h2 className="mt-4 font-semibold">Display</h2>
      <label className="block">Text size{' '}
        <select value={prefs.display.textSize} onChange={(e) => setDisplay('textSize', e.target.value)} className="border">
          <option value="m">Normal</option><option value="l">Large</option><option value="xl">Extra large</option>
        </select>
      </label>
      <label className="block">Contrast{' '}
        <select value={prefs.display.contrast} onChange={(e) => setDisplay('contrast', e.target.value)} className="border">
          <option value="normal">Normal</option><option value="high">High</option>
        </select>
      </label>
      <button type="button" onClick={reset} className="mt-4 rounded border px-3">Reset to default</button>
    </>
  );
}
