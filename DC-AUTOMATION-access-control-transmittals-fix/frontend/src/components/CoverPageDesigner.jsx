import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./cover-page-designer.css";

const SOURCES = [
  ["project.project_name", "Project Name"],
  ["project.project_code", "Project Code"],
  ["project.client_name", "Client / Customer"],
  ["document.document_number", "Document Number"],
  ["document.title", "Document Title"],
  ["document.customer_document_number", "Customer Document Number"],
  ["document.vendor_document_number", "Vendor Document Number"],
  ["document.document_type", "Document Type"],
  ["revision.revision_code", "Current Revision"],
  ["revision.revision_stage", "Current Stage"],
  ["revision.status", "Current Status"],
  ["revision.issue_purpose", "Issue Purpose"],
  ["revision.revision_date", "Revision Date"],
  ["latest_transmittal.transmittal_reference", "Latest Transmittal Reference"],
  ["latest_transmittal.customer_name", "Customer Name"],
  ["signatures.prepared_by", "Prepared By"],
  ["signatures.reviewed_by", "Reviewed / Checked By"],
  ["signatures.approved_by", "Approved By"],
];

const SOURCE_LABEL = Object.fromEntries(SOURCES);

function newField(index) {
  return {
    key: `custom_field_${Date.now()}_${index}`,
    label: "New Field",
    source: "document.title",
    x: 80,
    y: 600,
    width: 200,
    height: 14,
    fontSize: 8,
    fontWeight: "regular",
    align: "left",
    whiteout: false,
    enabled: true,
  };
}

export default function CoverPageDesigner({ project, onClose }) {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [config, setConfig] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [configResponse, documentsResponse] = await Promise.all([
        api.get(`/project-cover-page-configs/${project.id}`),
        api.get(`/documents?project_id=${project.id}`),
      ]);

      const loaded = configResponse.data;
      setConfig({
        ...loaded,
        layout_config: loaded.layout_config || {},
        field_mappings: Array.isArray(loaded.field_mappings) ? loaded.field_mappings : [],
        table_mappings: Array.isArray(loaded.table_mappings) ? loaded.table_mappings : [],
        logo_config: Array.isArray(loaded.logo_config) ? loaded.logo_config : [],
      });

      const payload = documentsResponse.data;
      const rows = Array.isArray(payload) ? payload : payload?.documents || payload?.data || [];
      setDocuments(rows);
      if (rows[0]?.id) setSelectedDocumentId(String(rows[0].id));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load cover-page configuration.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [project?.id]);

  const selectedDocument = useMemo(
    () => documents.find((item) => String(item.id) === String(selectedDocumentId)),
    [documents, selectedDocumentId],
  );

  function updateField(index, key, value) {
    setConfig((current) => ({
      ...current,
      field_mappings: current.field_mappings.map((field, i) =>
        i === index ? { ...field, [key]: value } : field,
      ),
    }));
  }

  function addField() {
    setConfig((current) => ({
      ...current,
      field_mappings: [...current.field_mappings, newField(current.field_mappings.length)],
    }));
  }

  function removeField(index) {
    setConfig((current) => ({
      ...current,
      field_mappings: current.field_mappings.filter((_, i) => i !== index),
    }));
  }

  function updateRevisionTable(key, value) {
    setConfig((current) => {
      const existing = current.table_mappings.find((item) => item.type === "revision_history") || {
        type: "revision_history",
        enabled: true,
        x: 45,
        y: 250,
        rowHeight: 18,
        maxRows: 8,
      };
      const next = { ...existing, [key]: value };
      const rest = current.table_mappings.filter((item) => item.type !== "revision_history");
      return { ...current, table_mappings: [...rest, next] };
    });
  }

  const revisionTable = config?.table_mappings?.find((item) => item.type === "revision_history") || {
    type: "revision_history",
    enabled: true,
    x: 45,
    y: 250,
    rowHeight: 18,
    maxRows: 8,
  };

  async function save() {
    try {
      setSaving(true);
      setError("");
      setNotice("");
      const response = await api.put(`/project-cover-page-configs/${project.id}`, {
        layout_config: config.layout_config,
        field_mappings: config.field_mappings,
        table_mappings: config.table_mappings,
        logo_config: config.logo_config,
      });
      setConfig(response.data);
      setNotice("Cover-page configuration saved.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save cover-page configuration.");
    } finally {
      setSaving(false);
    }
  }

  async function preview() {
    if (!selectedDocumentId) {
      setError("Select a project document for the preview.");
      return;
    }

    const popup = window.open("", "_blank");
    try {
      const response = await api.get(`/documents/${selectedDocumentId}/cover-page`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      if (popup) popup.location.href = url;
      else window.open(url, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      if (popup && !popup.closed) popup.close();
      setError(err.response?.data?.message || "Unable to generate the preview PDF.");
    }
  }

  if (!isAdmin) {
    return (
      <section className="cpd-panel">
        <div className="cpd-denied">Only administrators can configure project cover pages.</div>
      </section>
    );
  }

  if (loading) {
    return <section className="cpd-panel"><div className="cpd-loading">Loading Cover Page Designer…</div></section>;
  }

  if (!config) {
    return <section className="cpd-panel"><div className="cpd-denied">Upload a cover-page template before opening the designer.</div></section>;
  }

  return (
    <section className="cpd-panel">
      <div className="cpd-header">
        <div>
          <p className="cpd-eyebrow">ADMINISTRATION · COVER PAGE</p>
          <h3>Cover Page Designer</h3>
          <p>Configure where live project and document data is written onto this project’s PDF template.</p>
        </div>
        <div className="cpd-actions">
          {onClose && <button className="cpd-secondary" onClick={onClose}>Close</button>}
          <button className="cpd-secondary" onClick={preview} disabled={!selectedDocumentId}>Preview PDF</button>
          <button className="cpd-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Configuration"}</button>
        </div>
      </div>

      {error && <div className="cpd-alert error">{error}</div>}
      {notice && <div className="cpd-alert success">{notice}</div>}

      <div className="cpd-toolbar">
        <div>
          <label>Preview with document</label>
          <select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)}>
            <option value="">Select document…</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.document_number} — {document.title}
              </option>
            ))}
          </select>
        </div>
        <div className="cpd-preview-summary">
          <span>Project</span><strong>{project.project_code}</strong>
          <span>Template</span><strong>{config.template?.template_name || "cover-page.pdf"}</strong>
          <span>Version</span><strong>{config.template?.template_version || "1"}</strong>
        </div>
      </div>

      <div className="cpd-grid">
        <div className="cpd-card">
          <div className="cpd-card-header">
            <div><h4>Dynamic Fields</h4><p>Each field is populated from live database data.</p></div>
            <button className="cpd-secondary small" onClick={addField}>+ Add Field</button>
          </div>

          <div className="cpd-field-list">
            {config.field_mappings.map((field, index) => (
              <div className="cpd-field-row" key={field.key || index}>
                <div className="cpd-field-top">
                  <input value={field.label || ""} onChange={(e) => updateField(index, "label", e.target.value)} placeholder="Field label" />
                  <select value={field.source || ""} onChange={(e) => updateField(index, "source", e.target.value)}>
                    {SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <button className="cpd-remove" onClick={() => removeField(index)} title="Remove field">×</button>
                </div>
                <div className="cpd-field-meta">
                  <label>X<input type="number" value={field.x ?? 0} onChange={(e) => updateField(index, "x", Number(e.target.value))} /></label>
                  <label>Y<input type="number" value={field.y ?? 0} onChange={(e) => updateField(index, "y", Number(e.target.value))} /></label>
                  <label>Width<input type="number" value={field.width ?? 200} onChange={(e) => updateField(index, "width", Number(e.target.value))} /></label>
                  <label>Height<input type="number" value={field.height ?? 14} onChange={(e) => updateField(index, "height", Number(e.target.value))} /></label>
                  <label>Font<input type="number" value={field.fontSize ?? 8} onChange={(e) => updateField(index, "fontSize", Number(e.target.value))} /></label>
                  <label>Align<select value={field.align || "left"} onChange={(e) => updateField(index, "align", e.target.value)}><option>left</option><option>center</option><option>right</option></select></label>
                  <label>Weight<select value={field.fontWeight || "regular"} onChange={(e) => updateField(index, "fontWeight", e.target.value)}><option value="regular">Regular</option><option value="bold">Bold</option></select></label>
                  <label className="cpd-check"><input type="checkbox" checked={field.whiteout !== false} onChange={(e) => updateField(index, "whiteout", e.target.checked)} /> Whiteout</label>
                  <label className="cpd-check"><input type="checkbox" checked={field.enabled !== false} onChange={(e) => updateField(index, "enabled", e.target.checked)} /> Enabled</label>
                </div>
                <div className="cpd-source-note">{SOURCE_LABEL[field.source] || field.source}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cpd-side">
          <div className="cpd-card">
            <div className="cpd-card-header"><div><h4>Revision History Table</h4><p>Uses the actual revision records in PostgreSQL.</p></div></div>
            <div className="cpd-table-settings">
              <label><span>Enabled</span><input type="checkbox" checked={revisionTable.enabled !== false} onChange={(e) => updateRevisionTable("enabled", e.target.checked)} /></label>
              <label><span>X</span><input type="number" value={revisionTable.x ?? 45} onChange={(e) => updateRevisionTable("x", Number(e.target.value))} /></label>
              <label><span>Y</span><input type="number" value={revisionTable.y ?? 250} onChange={(e) => updateRevisionTable("y", Number(e.target.value))} /></label>
              <label><span>Row height</span><input type="number" value={revisionTable.rowHeight ?? 18} onChange={(e) => updateRevisionTable("rowHeight", Number(e.target.value))} /></label>
              <label><span>Maximum rows</span><input type="number" value={revisionTable.maxRows ?? 8} onChange={(e) => updateRevisionTable("maxRows", Number(e.target.value))} /></label>
            </div>
            <div className="cpd-table-columns">
              <strong>Default columns</strong>
              <span>Revision · Date · Reason for Issue</span>
              <small>Column widths can be expanded into the full visual designer in the next iteration.</small>
            </div>
          </div>

          <div className="cpd-card cpd-doc-card">
            <div className="cpd-card-header"><div><h4>Preview Data</h4><p>Values come from the selected document.</p></div></div>
            {selectedDocument ? (
              <dl>
                <div><dt>Document</dt><dd>{selectedDocument.document_number || "—"}</dd></div>
                <div><dt>Title</dt><dd>{selectedDocument.title || "—"}</dd></div>
                <div><dt>Customer Document</dt><dd>{selectedDocument.customer_document_number || "—"}</dd></div>
                <div><dt>Vendor Document</dt><dd>{selectedDocument.vendor_document_number || "—"}</dd></div>
              </dl>
            ) : <div className="cpd-empty">Choose a document to inspect its live data.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
