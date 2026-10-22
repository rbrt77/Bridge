-- Owner: Track A. PLAN §8. Supabase project in EU (Frankfurt).
create extension if not exists vector;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table organization_members (
  org_id uuid references organizations on delete cascade,
  user_id uuid references auth.users on delete cascade,
  display_name text not null,
  role text not null check (role in ('admin','manager','member')) default 'member',
  manager_id uuid references auth.users,
  github_login text,
  primary key (org_id, user_id)
);

create table kb_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations on delete cascade,
  title text not null,
  source_id text,             -- runSync key (e.g. repo path)
  url text,
  doc_type text not null check (doc_type in ('handbook','procedure','repo_doc','adr','faq','legal','code_map')),
  access_group text default 'all',
  approved_by uuid references auth.users,  -- FAQ only
  readability real,
  updated_at timestamptz default now()
);

create table documents (       -- chunks
  id bigserial primary key,
  document_id uuid references kb_documents on delete cascade,
  org_id uuid references organizations on delete cascade,
  content text not null,
  context text,
  section_path text,
  page int,
  chunk_index int not null,
  doc_type text not null,
  access_group text default 'all',
  embedding vector(1536),
  fts tsvector generated always as (to_tsvector('english', coalesce(context,'') || ' ' || content)) stored
);
create index documents_fts_idx on documents using gin (fts);
create index documents_embedding_idx on documents using hnsw (embedding vector_cosine_ops);

create table glossary_terms (
  id bigserial primary key,
  org_id uuid references organizations on delete cascade,
  term text not null,
  definition text not null,
  document_id uuid references kb_documents on delete set null,
  unique (org_id, term)
);

create table topic_owners (
  id bigserial primary key,
  org_id uuid references organizations on delete cascade,
  pattern text not null,
  owner_login text not null
);

create table user_profiles (    -- NO diagnosis field, ever
  user_id uuid primary key references auth.users on delete cascade,
  prefs jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table help_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations on delete cascade,
  requester_id uuid references auth.users not null,
  helper_id uuid references auth.users not null,
  question text not null,
  ticket_url text,
  status text not null default 'open' check (status in ('open','answered','closed')),
  created_at timestamptz default now()
);

create table help_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references help_threads on delete cascade,
  author_id uuid references auth.users not null,
  body text not null,
  created_at timestamptz default now()
);

create table anonymous_questions ( -- NO user_id
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations on delete cascade,
  question_redacted text not null,
  topic text,
  week date not null default date_trunc('week', now()),
  claim_token_hash text not null,
  faq_id uuid references kb_documents,
  is_seed boolean default false
);

create table checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  title text not null,
  source_url text,
  created_at timestamptz default now()
);
create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid references checklists on delete cascade,
  text text not null,
  minutes int,
  due date,
  done boolean default false,
  position int not null default 0
);

create table meeting_notes (    -- NO transcript
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  title text,
  summary jsonb,
  my_tasks jsonb,
  decisions jsonb,
  created_at timestamptz default now()
);

create table audit_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations on delete cascade,
  repo text not null,
  score int,
  created_at timestamptz default now()
);
create table audit_findings (
  id bigserial primary key,
  run_id uuid references audit_runs on delete cascade,
  criterion_id text not null,
  status text check (status in ('ok','partial','missing')),
  evidence text,
  first_step text,
  priority real
);

-- TODO(A): hybrid_search(query_text, query_embedding, org, doc_types, match_count) with RRF k=60
-- TODO(A): insights_themes(min_k int default 5) returning only groups with count >= min_k
