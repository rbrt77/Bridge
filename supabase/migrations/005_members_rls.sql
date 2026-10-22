-- Owner: Track A. Client reads its own org + role straight from organization_members;
-- without a select policy RLS returns 0 rows and everyone falls back to 'member'.
-- Writes stay server-side (service role bypasses RLS).
alter table organization_members enable row level security;

drop policy if exists "read own membership" on organization_members;
create policy "read own membership" on organization_members
  for select to authenticated
  using (user_id = auth.uid());
