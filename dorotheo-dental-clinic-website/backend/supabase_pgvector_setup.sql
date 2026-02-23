-- ============================================================
-- Supabase pgvector Setup for DDC RAG
-- Run each block in: Supabase → SQL Editor
-- ============================================================
-- Django table name: api_pagechunk  (app=api, model=PageChunk)
-- Embedding model:   gemini-embedding-001  → 3072 dims
-- ⚠️  Verify dimension: open Django shell, run:
--       from api.rag.embedding_service import generate_embedding
--       print(len(generate_embedding("test")))
-- Change 3072 everywhere below if different.
-- ============================================================


-- ── STEP 1: Enable pgvector ────────────────────────────────────────────────
-- Run this BEFORE running Django migrations.

CREATE EXTENSION IF NOT EXISTS vector;


-- ── STEP 2: Verify the extension is active ────────────────────────────────

SELECT * FROM pg_extension WHERE extname = 'vector';
-- Should return one row.


-- ── STEP 3 (optional): Check existing embedding column after migration ─────
-- Run AFTER deploying and running `python manage.py migrate`.

SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'api_pagechunk'
ORDER BY ordinal_position;
-- 'embedding' should show data_type='USER-DEFINED' and udt_name='vector'.


-- ── STEP 4 (optional): Verify index was created by migration ───────────────

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'api_pagechunk';
-- Should show pagechunk_embedding_cosine_idx using ivfflat.


-- ── STEP 5: Create match_page_chunks SQL function ─────────────────────────
-- Optional — Django's CosineDistance ORM query replaces this.
-- Useful if you ever want to call retrieval directly from Supabase client
-- or from a PostgreSQL function/trigger.

CREATE OR REPLACE FUNCTION match_page_chunks (
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.55,
  match_count     int   DEFAULT 5
)
RETURNS TABLE (
  id            int,
  page_id       text,
  page_title    text,
  section_title text,
  chunk_text    text,
  source_url    text,
  chunk_index   int,
  similarity    float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    page_id,
    page_title,
    section_title,
    chunk_text,
    source_url,
    chunk_index,
    1 - (embedding <=> query_embedding) AS similarity
  FROM api_pagechunk
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) >= match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;


-- ── STEP 6: Verify chunk count ─────────────────────────────────────────────

SELECT
    COUNT(*)                                        AS total_chunks,
    COUNT(*) FILTER (WHERE embedding IS NOT NULL)  AS chunks_with_vectors,
    COUNT(*) FILTER (WHERE embedding IS NULL)      AS chunks_missing_vectors
FROM api_pagechunk;
-- chunks_with_vectors should be > 0 after re-indexing.


-- ── STEP 7: Quick retrieval smoke test ─────────────────────────────────────
-- Replace the zeros array with a real query embedding from your app.
-- This just confirms the function works; use your actual embedding vector.

-- SELECT * FROM match_page_chunks(
--   query_embedding := ARRAY_FILL(0.0::float4, ARRAY[3072])::vector,
--   match_threshold := 0.1,
--   match_count := 3
-- );


-- ── STEP 8: Row Level Security (RLS) ──────────────────────────────────────
-- The api_pagechunk table should NOT be publicly readable.
-- Django backend connects via DATABASE_URL (service role / direct connection)
-- which bypasses RLS — so RLS protects against accidental direct client access.

-- Enable RLS:
ALTER TABLE api_pagechunk ENABLE ROW LEVEL SECURITY;

-- Deny all public access (anon key cannot read embeddings):
CREATE POLICY "No public access to page chunks"
    ON api_pagechunk
    FOR ALL
    TO anon
    USING (false);

-- Backend (service role) bypasses RLS automatically — no policy needed.


-- ── STEP 9: Rebuild index after bulk re-indexing ──────────────────────────
-- If you re-run the RAG indexer and add many chunks at once,
-- rebuild the index for optimal performance:

-- REINDEX INDEX CONCURRENTLY pagechunk_embedding_cosine_idx;

-- Or increase lists if you have >10k chunks:
-- DROP INDEX IF EXISTS pagechunk_embedding_cosine_idx;
-- CREATE INDEX pagechunk_embedding_cosine_idx
--   ON api_pagechunk
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);   -- use ~sqrt(row_count)
