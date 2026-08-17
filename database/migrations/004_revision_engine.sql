ALTER TABLE revisions
ADD COLUMN sequence_order INTEGER;

ALTER TABLE revisions
ADD COLUMN revision_stage VARCHAR(50);

CREATE INDEX idx_revisions_document
ON revisions(document_id);

CREATE INDEX idx_revisions_document_sequence
ON revisions(document_id, sequence_order);