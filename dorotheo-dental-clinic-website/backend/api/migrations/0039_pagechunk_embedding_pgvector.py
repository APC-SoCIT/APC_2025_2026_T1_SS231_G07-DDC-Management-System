"""
Migration: Upgrade PageChunk.embedding from JSONField → pgvector VectorField

Steps:
  1. Enable pgvector extension in Postgres (idempotent)
  2. Add temp column 'embedding_vec' (VectorField, nullable)
  3. Backfill — copy existing JSON embeddings into the vector column
  4. Drop the old 'embedding' JSONField
  5. Rename 'embedding_vec' → 'embedding'
  6. Create ivfflat cosine-similarity index

⚠️  Run in Supabase BEFORE deploying:
      CREATE EXTENSION IF NOT EXISTS vector;
    (This migration also runs it, but having it pre-enabled is safer.)

⚠️  EMBEDDING DIMENSION must match your model.
    gemini-embedding-001 → 3072 dims (default below).
    Verify: open Django shell → from api.rag.embedding_service import generate_embedding
            e = generate_embedding("test"); print(len(e))
    If different, change EMBEDDING_DIM below AND in api/models.py BEFORE migrating.
"""

from django.db import migrations
from pgvector.django import VectorField

# ── CHANGE THIS if your embedding dimension differs ─────────────────────────
EMBEDDING_DIM = 3072


def backfill_embeddings(apps, schema_editor):
    """
    Copy existing JSON embeddings into the new vector column using raw SQL.
    Postgres: jsonb::text is already '[1.0, 2.0, ...]' which pgvector accepts.
    Rows with empty/null embeddings are left as NULL.
    """
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE api_pagechunk
            SET embedding_vec = CASE
                WHEN embedding IS NOT NULL
                     AND jsonb_typeof(embedding) = 'array'
                     AND jsonb_array_length(embedding) > 0
                THEN embedding::text::vector
                ELSE NULL
            END
        """)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0038_add_patient_pagination_indexes'),
    ]

    operations = [
        # ── 1. Enable pgvector ─────────────────────────────────────────────
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS vector;",
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ── 2. Add temporary Vector column ────────────────────────────────
        migrations.AddField(
            model_name='pagechunk',
            name='embedding_vec',
            field=VectorField(dimensions=EMBEDDING_DIM, null=True, blank=True),
        ),

        # ── 3. Backfill existing JSON embeddings → vector ──────────────────
        migrations.RunPython(
            backfill_embeddings,
            reverse_code=migrations.RunPython.noop,
        ),

        # ── 4. Drop old JSONField ──────────────────────────────────────────
        migrations.RemoveField(
            model_name='pagechunk',
            name='embedding',
        ),

        # ── 5. Rename embedding_vec → embedding ───────────────────────────
        migrations.RenameField(
            model_name='pagechunk',
            old_name='embedding_vec',
            new_name='embedding',
        ),

        # ── 6. Create ivfflat cosine-similarity index ──────────────────────
        # NOTE: 'lists' should be roughly sqrt(row_count).
        # For small tables (<10k rows), lists=50 is fine.
        # For larger tables, increase lists. Re-create index after bulk inserts.
        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS pagechunk_embedding_cosine_idx
                ON api_pagechunk
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 50);
            """,
            reverse_sql="DROP INDEX IF EXISTS pagechunk_embedding_cosine_idx;",
        ),
    ]
