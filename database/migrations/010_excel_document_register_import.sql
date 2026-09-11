ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS engineering_discipline VARCHAR(255),
  ADD COLUMN IF NOT EXISTS system_unit VARCHAR(100),
  ADD COLUMN IF NOT EXISTS originator_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_feed_document_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source_project_code VARCHAR(255),
  ADD COLUMN IF NOT EXISTS responsible_person VARCHAR(255),
  ADD COLUMN IF NOT EXISTS excel_source_row INTEGER,
  ADD COLUMN IF NOT EXISTS legacy_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_documents_vendor_document_number
  ON documents(vendor_document_number);

CREATE INDEX IF NOT EXISTS idx_documents_customer_document_number
  ON documents(customer_document_number);

CREATE INDEX IF NOT EXISTS idx_documents_source_project_code
  ON documents(source_project_code);
