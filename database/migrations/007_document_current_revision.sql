-- ============================================================
-- MIGRATION 007
-- DOCUMENT CURRENT REVISION
-- ============================================================
--
-- Purpose:
--
-- 1. Ensure documents.current_revision_id exists.
-- 2. Ensure revisions.sequence_order exists.
-- 3. Ensure the current-revision foreign key exists.
-- 4. Backfill missing current_revision_id values.
-- 5. Add an index for current revision lookups.
--
-- This migration is IDEMPOTENT.
--
-- ============================================================


BEGIN;


-- ============================================================
-- 1. ENSURE documents.current_revision_id EXISTS
-- ============================================================

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS current_revision_id INTEGER;


-- ============================================================
-- 2. ENSURE revisions.sequence_order EXISTS
-- ============================================================

ALTER TABLE revisions
ADD COLUMN IF NOT EXISTS sequence_order INTEGER;


-- ============================================================
-- 3. ENSURE CURRENT REVISION FOREIGN KEY EXISTS
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'documents_current_revision_id_fkey'
    ) THEN

        ALTER TABLE documents
        ADD CONSTRAINT documents_current_revision_id_fkey
        FOREIGN KEY (current_revision_id)
        REFERENCES revisions(id)
        ON DELETE SET NULL;

    END IF;

END
$$;


-- ============================================================
-- 4. BACKFILL MISSING sequence_order
-- ============================================================
--
-- Only NULL sequence_order values are populated.
-- Existing values are NOT changed.
--
-- ============================================================

WITH numbered_revisions AS (

    SELECT
        id,

        ROW_NUMBER() OVER (
            PARTITION BY document_id
            ORDER BY id
        ) AS calculated_sequence

    FROM revisions

    WHERE sequence_order IS NULL

)

UPDATE revisions AS r

SET sequence_order =
    nr.calculated_sequence

FROM numbered_revisions AS nr

WHERE r.id = nr.id;


-- ============================================================
-- 5. BACKFILL MISSING current_revision_id
-- ============================================================
--
-- Only documents where current_revision_id is NULL
-- will be updated.
--
-- Existing current_revision_id values are NEVER changed.
--
-- The latest revision is determined by:
--
--   1. sequence_order DESC
--   2. revision id DESC
--
-- ============================================================

WITH latest_revisions AS (

    SELECT DISTINCT ON (document_id)

        document_id,
        id AS revision_id

    FROM revisions

    ORDER BY
        document_id,
        sequence_order DESC NULLS LAST,
        id DESC

)

UPDATE documents AS d

SET current_revision_id =
    lr.revision_id

FROM latest_revisions AS lr

WHERE d.id = lr.document_id

  AND d.current_revision_id IS NULL;


-- ============================================================
-- 6. INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_documents_current_revision
ON documents(current_revision_id);


-- ============================================================
-- 7. COMPLETE
-- ============================================================

COMMIT;


-- ============================================================
-- MIGRATION 007 COMPLETE
-- ============================================================