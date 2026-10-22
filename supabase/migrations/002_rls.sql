-- Owner: Track A. TODO(A): port add_rls_policies.sql from Internal_ai and add:
alter table user_profiles enable row level security;
create policy "own profile" on user_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table help_threads enable row level security;
create policy "participants read thread" on help_threads for select using (auth.uid() in (requester_id, helper_id));

alter table help_messages enable row level security;
create policy "participants read messages" on help_messages for select using (
  exists (select 1 from help_threads t where t.id = thread_id and auth.uid() in (t.requester_id, t.helper_id)));
create policy "participants write messages" on help_messages for insert with check (
  author_id = auth.uid() and exists (select 1 from help_threads t where t.id = thread_id and auth.uid() in (t.requester_id, t.helper_id)));

alter table checklists enable row level security;
create policy "own checklists" on checklists for all using (auth.uid() = user_id);
alter table meeting_notes enable row level security;
create policy "own meeting notes" on meeting_notes for all using (auth.uid() = user_id);

-- documents / anonymous_questions: no direct PostgREST access; server (service role) + RPC only
alter table documents enable row level security;
alter table anonymous_questions enable row level security;
