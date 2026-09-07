CREATE TABLE IF NOT EXISTS project_cover_page_templates (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_name VARCHAR(200) NOT NULL,
  template_file_path TEXT NOT NULL,
  template_version VARCHAR(50) NOT NULL DEFAULT '1',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, template_name, template_version)
);

CREATE INDEX IF NOT EXISTS idx_project_cover_page_templates_project
  ON project_cover_page_templates(project_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_cover_page_templates_active
  ON project_cover_page_templates(project_id)
  WHERE is_active = TRUE;
