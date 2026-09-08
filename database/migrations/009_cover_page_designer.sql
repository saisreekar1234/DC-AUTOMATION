ALTER TABLE project_cover_page_templates
  ADD COLUMN IF NOT EXISTS layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS field_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS table_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS logo_config JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN project_cover_page_templates.layout_config IS
  'Project-specific page/layout settings used by the cover-page renderer.';
COMMENT ON COLUMN project_cover_page_templates.field_mappings IS
  'JSON array of dynamic text field placements and source bindings.';
COMMENT ON COLUMN project_cover_page_templates.table_mappings IS
  'JSON array of project-specific table placements/column definitions.';
COMMENT ON COLUMN project_cover_page_templates.logo_config IS
  'JSON array of project-specific logo placements.';
