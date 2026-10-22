// Dev-only marker so everyone sees who owns what on screen. Delete usages as features land.
export default function Todo({ owner, children }) {
  if (!import.meta.env.DEV) return null;
  return (
    <aside aria-label="Developer note" className="my-4 rounded-xl border-2 border-dashed border-border-subtle p-3 text-sm text-muted">
      <strong className="text-fg">TODO ({owner}):</strong> {children}
    </aside>
  );
}
