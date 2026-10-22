// Owner: Track B (F1). 5 questions about HOW you work (never a diagnosis) + quick starts + display/output settings.
// Every setting applies immediately across the app (ProfileProvider → data-* on <html>, prefs → /api/ask).
import { useRef, useState } from 'react';
import { useProfile } from '../a11y/ProfileProvider.jsx';
import { useAnnounce } from '../a11y/Announcer.jsx';
import { useSession } from '../auth/Session.jsx';
import { QUICK_STARTS, LABELS, togglePreset } from '../a11y/workStyle.js';
import WorkStyleWizard from '../components/WorkStyleWizard.jsx';

function SelectSetting({ group, name, prefs, onChange }) {
  const [label, values] = LABELS[group][name];
  const id = `set-${group}-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">{label}</label>
      <select id={id} value={prefs[group][name]} onChange={(e) => onChange(group, name, e.target.value)} className="field">
        {Object.entries(values).map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </div>
  );
}

function ToggleSetting({ group, name, prefs, onChange }) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" checked={prefs[group][name]} onChange={(e) => onChange(group, name, e.target.checked)} className="size-5 min-h-0" />
      {LABELS[group][name][0]}
    </label>
  );
}

export default function WorkStyle() {
  const { prefs, setPrefs, remove, sync, setSync } = useProfile();
  const { mode } = useSession();
  const announce = useAnnounce();
  const [wizard, setWizard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteButton = useRef(null);
  const wizardButton = useRef(null);

  const set = (group, name, value) => setPrefs((p) => ({ ...p, [group]: { ...p[group], [name]: value } }));

  const toggle = (q) => {
    const on = !prefs.preset.includes(q.id);
    setPrefs((p) => togglePreset(p, q.id));
    announce(`${q.label} ${on ? 'on' : 'off'}.`);
  };

  const closeWizard = () => { setWizard(false); setTimeout(() => wizardButton.current?.focus(), 0); };
  const saveWizard = (draft) => { setPrefs(draft); closeWizard(); announce('Work style saved. Your settings are applied everywhere.'); };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ prefs }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'bridge-work-style.json' });
    a.click();
    URL.revokeObjectURL(a.href);
    announce('Work style downloaded as bridge-work-style.json.');
  };

  const doDelete = async () => {
    const ok = await remove();
    setConfirmDelete(false);
    setTimeout(() => deleteButton.current?.focus(), 0);
    announce(ok ? 'Work style deleted. Default settings are back.' : 'Deleted on this device, but the copy in your account could not be removed. Try again.', { urgent: !ok });
  };

  return (
    <>
      <h1 className="text-3xl font-bold">Your work style</h1>
      <p className="mt-2 max-w-prose text-muted">
        Tell Bridge how you work best and it adapts the screen and every answer. Saved on this device only;
        nothing here is shared with your manager.
      </p>

      {wizard ? (
        <WorkStyleWizard prefs={prefs} onSave={saveWizard} onCancel={closeWizard} />
      ) : (
        <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 bg-accent-soft">
          <p><span className="font-semibold">New here?</span> Answer 5 short questions and we set everything for you.</p>
          <button ref={wizardButton} type="button" onClick={() => setWizard(true)} className="btn btn-primary">
            Set up in 5 questions
          </button>
        </div>
      )}

      <section aria-labelledby="qs-h" className="mt-10">
        <h2 id="qs-h" className="text-xl font-semibold">Quick starts</h2>
        <p className="text-muted">Turn on any that fit. Each one changes a few settings below; you can fine-tune them after.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {QUICK_STARTS.map((q) => {
            const on = prefs.preset.includes(q.id);
            return (
              <li key={q.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(q)}
                  className={`flex h-full w-full flex-col items-start gap-1 rounded-xl border-2 px-4 py-3 text-left ${on ? 'border-accent bg-accent-soft' : 'border-border-subtle bg-surface hover:border-accent'}`}
                >
                  <span className="flex w-full items-center justify-between gap-2 font-semibold">
                    {q.label}
                    <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full border-2 text-sm ${on ? 'border-accent bg-accent text-accent-fg' : 'border-border'}`}>
                      {on ? '✓' : ''}
                    </span>
                  </span>
                  <span className="text-sm text-muted">{q.hint}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="display-h" className="card mt-10">
        <h2 id="display-h" className="text-xl font-semibold">Display</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {['textSize', 'contrast', 'font', 'spacing', 'motion'].map((k) => <SelectSetting key={k} group="display" name={k} prefs={prefs} onChange={set} />)}
        </div>
      </section>

      <section aria-labelledby="answers-h" className="card mt-6">
        <h2 id="answers-h" className="text-xl font-semibold">Answers</h2>
        <p className="text-muted">How Ask, tickets, reviews and meeting notes are written for you.</p>
        <div className="mt-3 sm:max-w-xs">
          <SelectSetting group="output" name="length" prefs={prefs} onChange={set} />
        </div>
        <div className="mt-2 grid sm:grid-cols-2 sm:gap-x-4">
          {['tldr', 'steps', 'literal', 'screenReader', 'audio', 'diagrams'].map((k) => <ToggleSetting key={k} group="output" name={k} prefs={prefs} onChange={set} />)}
          <ToggleSetting group="input" name="voice" prefs={prefs} onChange={set} />
        </div>
      </section>

      <section aria-labelledby="data-h" className="card mt-6">
        <h2 id="data-h" className="text-xl font-semibold">Your data</h2>
        {mode === 'supabase' && (
          <label className="mt-2 flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} className="size-5 min-h-0" />
            Keep a copy in my account so it follows me to other devices (only you can see it)
          </label>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={exportJson} className="btn">Export as file</button>
          {!confirmDelete && (
            <button ref={deleteButton} type="button" onClick={() => setConfirmDelete(true)} className="btn btn-danger">Delete my work style</button>
          )}
        </div>
        {confirmDelete && (
          <div role="group" aria-labelledby="del-q" className="mt-3 rounded-xl border-2 border-danger p-4">
            <p id="del-q">Delete your work style{sync ? ' from this device and your account' : ''}? Settings go back to default.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {/* eslint-disable-next-line jsx-a11y/no-autofocus -- focus must move into the confirmation it just opened */}
              <button type="button" autoFocus onClick={doDelete} className="btn border-danger bg-danger text-surface">Yes, delete</button>
              <button type="button" onClick={() => { setConfirmDelete(false); setTimeout(() => deleteButton.current?.focus(), 0); }} className="btn">Cancel</button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
