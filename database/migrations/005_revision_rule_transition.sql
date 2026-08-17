ALTER TABLE project_revision_rules
ADD COLUMN approved_issue_purposes JSONB NOT NULL DEFAULT '[]';