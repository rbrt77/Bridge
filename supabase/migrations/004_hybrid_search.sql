-- Owner: Track A (A7). Hybrid search: FTS top 40 + vector top 40 → Reciprocal Rank Fusion (k=60).
-- similarity = cosine similarity (null if the chunk only matched FTS); used for abstain when rerank is unavailable.
-- mode: 'hybrid' (default) | 'vector' | 'fts' — the last two exist for eval/run.js comparisons.
create or replace function hybrid_search(
  query_text text,
  query_embedding vector(1536),
  p_org_id uuid,
  p_doc_types text[] default null,
  match_count int default 30,
  fts_k int default 40,
  vec_k int default 40,
  rrf_k int default 60,
  mode text default 'hybrid'
)
returns table (
  id bigint,
  document_id uuid,
  content text,
  context text,
  section_path text,
  page int,
  chunk_index int,
  doc_type text,
  title text,
  url text,
  approved_by text,
  fts_rank int,
  vec_rank int,
  similarity double precision,
  score double precision
)
language sql stable
set search_path = public, extensions
as $$
  with
  -- OR the stemmed terms: natural-language questions rarely contain every word of the answer chunk.
  q as (
    select nullif(replace(plainto_tsquery('english', query_text)::text, ' & ', ' | '), '')::tsquery as tsq
  ),
  fts as (
    select d.id, row_number() over (order by ts_rank_cd(d.fts, q.tsq) desc) as rnk
    from documents d, q
    where mode in ('hybrid', 'fts')
      and q.tsq is not null
      and d.org_id = p_org_id
      and (p_doc_types is null or d.doc_type = any (p_doc_types))
      and d.fts @@ q.tsq
    order by ts_rank_cd(d.fts, q.tsq) desc
    limit fts_k
  ),
  vec as (
    select d.id,
           row_number() over (order by d.embedding <=> query_embedding) as rnk,
           1 - (d.embedding <=> query_embedding) as sim
    from documents d
    where mode in ('hybrid', 'vector')
      and d.org_id = p_org_id
      and (p_doc_types is null or d.doc_type = any (p_doc_types))
      and d.embedding is not null
    order by d.embedding <=> query_embedding
    limit vec_k
  ),
  fused as (
    select coalesce(f.id, v.id) as id,
           f.rnk::int as fts_rank,
           v.rnk::int as vec_rank,
           v.sim as similarity,
           coalesce(1.0 / (rrf_k + f.rnk), 0) + coalesce(1.0 / (rrf_k + v.rnk), 0) as score
    from fts f
    full outer join vec v on v.id = f.id
  )
  select d.id, d.document_id, d.content, d.context, d.section_path, d.page, d.chunk_index, d.doc_type,
         k.title, k.url, m.display_name as approved_by,
         fu.fts_rank, fu.vec_rank, fu.similarity, fu.score
  from fused fu
  join documents d on d.id = fu.id
  join kb_documents k on k.id = d.document_id
  left join organization_members m on m.user_id = k.approved_by and m.org_id = k.org_id
  order by fu.score desc
  limit match_count;
$$;

-- Server-only (service role). Clients never call this directly.
revoke execute on function hybrid_search from public, anon, authenticated;
