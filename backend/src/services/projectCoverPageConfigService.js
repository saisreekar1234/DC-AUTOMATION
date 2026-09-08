const pool = require("../config/database");

const DEFAULT_FIELDS = [
  { key: "project_name", label: "Project Name", source: "project.project_name", x: 120, y: 807, width: 360, height: 16, fontSize: 9, align: "center", whiteout: false, enabled: true },
  { key: "project_code", label: "Project Code / Number", source: "project.project_code", x: 120, y: 793, width: 360, height: 16, fontSize: 8, align: "center", whiteout: false, enabled: true },
  { key: "document_title", label: "Document Title", source: "document.title", x: 120, y: 765, width: 360, height: 18, fontSize: 9, align: "center", whiteout: false, enabled: true },
  { key: "document_number", label: "Document Number", source: "document.document_number", x: 120, y: 740, width: 360, height: 14, fontSize: 8, align: "center", whiteout: false, enabled: true },
  { key: "customer_document_number", label: "Customer Document Number", source: "document.customer_document_number", x: 120, y: 726, width: 360, height: 14, fontSize: 8, align: "center", whiteout: false, enabled: true },
  { key: "current_revision", label: "Current Revision", source: "revision.revision_code", x: 465, y: 726, width: 35, height: 14, fontSize: 8, align: "center", whiteout: false, enabled: true },
  { key: "current_revision_date", label: "Revision Date", source: "revision.revision_date", x: 120, y: 710, width: 120, height: 14, fontSize: 8, align: "left", whiteout: false, enabled: true },
  { key: "issue_purpose", label: "Issue Purpose", source: "revision.issue_purpose", x: 245, y: 710, width: 220, height: 14, fontSize: 8, align: "left", whiteout: false, enabled: true },
  { key: "vendor_document_number", label: "Vendor Document Number", source: "document.vendor_document_number", x: 120, y: 680, width: 180, height: 14, fontSize: 8, align: "left", whiteout: false, enabled: true },
  { key: "document_type", label: "Document Type", source: "document.document_type", x: 305, y: 680, width: 140, height: 14, fontSize: 8, align: "left", whiteout: false, enabled: true },
];

const SOURCE_LABELS = {
  "project.project_name": "Project Name",
  "project.project_code": "Project Code",
  "project.client_name": "Client / Customer",
  "document.document_number": "Document Number",
  "document.title": "Document Title",
  "document.customer_document_number": "Customer Document Number",
  "document.vendor_document_number": "Vendor Document Number",
  "document.document_type": "Document Type",
  "revision.revision_code": "Current Revision",
  "revision.revision_stage": "Current Stage",
  "revision.status": "Current Status",
  "revision.issue_purpose": "Issue Purpose",
  "revision.revision_date": "Revision Date",
  "latest_transmittal.transmittal_reference": "Latest Transmittal Reference",
  "latest_transmittal.customer_name": "Customer Name",
};

function normalizeConfig(row) {
  return {
    template: row,
    layout_config: row.layout_config || {},
    field_mappings: Array.isArray(row.field_mappings) && row.field_mappings.length ? row.field_mappings : DEFAULT_FIELDS,
    table_mappings: Array.isArray(row.table_mappings) ? row.table_mappings : [],
    logo_config: Array.isArray(row.logo_config) ? row.logo_config : [],
  };
}

async function getActiveConfig(projectId) {
  const result = await pool.query(
    `SELECT * FROM project_cover_page_templates
     WHERE project_id = $1 AND is_active = TRUE
     ORDER BY id DESC LIMIT 1`,
    [projectId]
  );
  if (!result.rows.length) return null;
  return normalizeConfig(result.rows[0]);
}

async function saveConfig(projectId, payload, userId) {
  const current = await getActiveConfig(projectId);
  if (!current) {
    const error = new Error("Upload a cover-page template before configuring its fields");
    error.statusCode = 409;
    throw error;
  }

  const fieldMappings = Array.isArray(payload.field_mappings) ? payload.field_mappings : [];
  const tableMappings = Array.isArray(payload.table_mappings) ? payload.table_mappings : [];
  const logoConfig = Array.isArray(payload.logo_config) ? payload.logo_config : [];
  const layoutConfig = payload.layout_config && typeof payload.layout_config === "object" ? payload.layout_config : {};

  const result = await pool.query(
    `UPDATE project_cover_page_templates
     SET layout_config = $1::jsonb,
         field_mappings = $2::jsonb,
         table_mappings = $3::jsonb,
         logo_config = $4::jsonb,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 AND project_id = $6 AND is_active = TRUE
     RETURNING *`,
    [JSON.stringify(layoutConfig), JSON.stringify(fieldMappings), JSON.stringify(tableMappings), JSON.stringify(logoConfig), current.template.id, projectId]
  );

  return normalizeConfig(result.rows[0]);
}

module.exports = {
  DEFAULT_FIELDS,
  SOURCE_LABELS,
  getActiveConfig,
  saveConfig,
};
