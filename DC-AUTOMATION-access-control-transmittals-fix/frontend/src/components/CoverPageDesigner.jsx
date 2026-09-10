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

function defaultRevisionTable() {
  return {
    type: "revision_history",
    enabled: true,
    x: 45,
    y: 250,
    rowHeight: 18,
    maxRows: 8,
  };
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function CoverPageDesigner({ project, onClose }) {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const [config, setConfig] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [activeSection, setActiveSection] = useState("fields");

  async function load() {
    if (!project?.id) return;

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
        field_mappings: Array.isArray(loaded.field_mappings)
          ? loaded.field_mappings
          : [],
        table_mappings: Array.isArray(loaded.table_mappings)
          ? loaded.table_mappings
          : [],
        logo_config: Array.isArray(loaded.logo_config)
          ? loaded.logo_config
          : [],
      });

      const payload = documentsResponse.data;
      const rows = Array.isArray(payload)
        ? payload
        : payload?.documents || payload?.data || [];

      setDocuments(rows);

      if (rows.length && !selectedDocumentId) {
        setSelectedDocumentId(String(rows[0].id));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load cover-page configuration."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [project?.id]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectedDocument = useMemo(
    () =>
      documents.find(
        (item) => String(item.id) === String(selectedDocumentId)
      ),
    [documents, selectedDocumentId]
  );

  function updateField(index, key, value) {
    setConfig((current) => ({
      ...current,
      field_mappings: current.field_mappings.map((field, i) =>
        i === index ? { ...field, [key]: value } : field
      ),
    }));
  }

  function addField() {
    setConfig((current) => ({
      ...current,
      field_mappings: [
        ...current.field_mappings,
        newField(current.field_mappings.length),
      ],
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
      const existing =
        current.table_mappings.find(
          (item) => item.type === "revision_history"
        ) || defaultRevisionTable();

      const next = {
        ...existing,
        [key]: value,
      };

      const rest = current.table_mappings.filter(
        (item) => item.type !== "revision_history"
      );

      return {
        ...current,
        table_mappings: [...rest, next],
      };
    });
  }

  const revisionTable =
    config?.table_mappings?.find(
      (item) => item.type === "revision_history"
    ) || defaultRevisionTable();

  async function save() {
    if (!config) return;

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const response = await api.put(
        `/project-cover-page-configs/${project.id}`,
        {
          layout_config: config.layout_config,
          field_mappings: config.field_mappings,
          table_mappings: config.table_mappings,
          logo_config: config.logo_config,
        }
      );

      setConfig(response.data);
      setNotice("Cover-page configuration saved successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save cover-page configuration."
      );
    } finally {
      setSaving(false);
    }
  }

  async function preview() {
    if (!selectedDocumentId) {
      setError("Select a project document before previewing.");
      return;
    }

    try {
      setPreviewLoading(true);
      setError("");
      setNotice("");

      const response = await api.get(
        `/documents/${selectedDocumentId}/cover-page`,
        { responseType: "blob" }
      );

      const contentType =
        response.headers?.["content-type"] || "application/pdf";

      if (!contentType.includes("pdf")) {
        throw new Error(
          "The server did not return a PDF. Check the backend cover-page response."
        );
      }

      const nextUrl = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );

      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });

      setNotice("Live cover-page preview generated.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to generate the preview PDF."
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  function openPreviewInNewTab() {
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  }

  if (!isAdmin) {
    return (
      <section className="cpd-v2-shell">
        <div className="cpd-v2-empty">
          <div className="cpd-v2-empty-icon">!</div>
          <h2>Administrator access required</h2>
          <p>
            Only administrators can configure project cover-page templates
            and field mappings.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="cpd-v2-shell">
        <div className="cpd-v2-loading">
          <div className="cpd-v2-spinner" />
          <strong>Loading Cover Page Designer</strong>
          <span>Loading the project template and live document data…</span>
        </div>
      </section>
    );
  }

  if (!config) {
    return (
      <section className="cpd-v2-shell">
        <div className="cpd-v2-empty">
          <div className="cpd-v2-empty-icon">PDF</div>
          <h2>No active template</h2>
          <p>
            Upload the approved blank cover-page PDF for this project before
            opening the designer.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="cpd-v2-shell">
      <header className="cpd-v2-header">
        <div className="cpd-v2-title">
          <div className="cpd-v2-title-icon">CP</div>
          <div>
            <div className="cpd-v2-eyebrow">PROJECT CONFIGURATION</div>
            <h1>Cover Page Designer</h1>
            <p>
              Configure live project, document and revision data on the
              controlled PDF template.
            </p>
          </div>
        </div>

        <div className="cpd-v2-header-actions">
          {onClose && (
            <button className="cpd-v2-btn secondary" onClick={onClose}>
              Close
            </button>
          )}
          <button
            className="cpd-v2-btn secondary"
            onClick={preview}
            disabled={!selectedDocumentId || previewLoading}
          >
            {previewLoading ? "Generating…" : "Generate Preview"}
          </button>
          <button
            className="cpd-v2-btn primary"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Configuration"}
          </button>
        </div>
      </header>

      {error && (
        <div className="cpd-v2-alert error">
          <strong>Action required</strong>
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {notice && (
        <div className="cpd-v2-alert success">
          <span className="cpd-v2-alert-check">✓</span>
          <span>{notice}</span>
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}

      <div className="cpd-v2-context">
        <div className="cpd-v2-context-item">
          <span>PROJECT</span>
          <strong>{project.project_code || project.project_name}</strong>
        </div>
        <div className="cpd-v2-context-item wide">
          <span>TEMPLATE</span>
          <strong>
            {config.template?.template_name || "cover-page.pdf"}
          </strong>
        </div>
        <div className="cpd-v2-context-item">
          <span>VERSION</span>
          <strong>{config.template?.template_version || "1"}</strong>
        </div>
        <div className="cpd-v2-context-item wide">
          <span>PREVIEW DOCUMENT</span>
          <select
            value={selectedDocumentId}
            onChange={(event) => {
              setSelectedDocumentId(event.target.value);
              setPreviewUrl("");
              setNotice("");
            }}
          >
            <option value="">Select document…</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.document_number} — {document.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cpd-v2-workspace">
        <aside className="cpd-v2-sidebar">
          <div className="cpd-v2-sidebar-label">DESIGN</div>

          <button
            className={
              activeSection === "fields"
                ? "cpd-v2-side-link active"
                : "cpd-v2-side-link"
            }
            onClick={() => setActiveSection("fields")}
          >
            <span className="cpd-v2-side-icon">T</span>
            <span>
              <strong>Dynamic Fields</strong>
              <small>{config.field_mappings.length} mapped fields</small>
            </span>
          </button>

          <button
            className={
              activeSection === "revision"
                ? "cpd-v2-side-link active"
                : "cpd-v2-side-link"
            }
            onClick={() => setActiveSection("revision")}
          >
            <span className="cpd-v2-side-icon">R</span>
            <span>
              <strong>Revision History</strong>
              <small>
                {revisionTable.enabled ? "Enabled" : "Disabled"}
              </small>
            </span>
          </button>

          <button
            className={
              activeSection === "preview"
                ? "cpd-v2-side-link active"
                : "cpd-v2-side-link"
            }
            onClick={() => setActiveSection("preview")}
          >
            <span className="cpd-v2-side-icon">P</span>
            <span>
              <strong>Live Preview</strong>
              <small>
                {previewUrl ? "Preview ready" : "Generate a preview"}
              </small>
            </span>
          </button>

          <div className="cpd-v2-sidebar-divider" />

          <div className="cpd-v2-template-card">
            <span className="cpd-v2-template-badge">PDF TEMPLATE</span>
            <strong>
              {config.template?.template_name || "cover-page.pdf"}
            </strong>
            <span>
              Controlled template for {project.project_code || "this project"}
            </span>
          </div>
        </aside>

        <main className="cpd-v2-main">
          {activeSection === "fields" && (
            <section className="cpd-v2-section">
              <div className="cpd-v2-section-heading">
                <div>
                  <span className="cpd-v2-section-number">01</span>
                  <div>
                    <h2>Dynamic Fields</h2>
                    <p>
                      Every mapped field is populated from live system data
                      when the PDF is generated.
                    </p>
                  </div>
                </div>

                <button
                  className="cpd-v2-btn secondary"
                  onClick={addField}
                >
                  + Add Field
                </button>
              </div>

              <div className="cpd-v2-field-table">
                <div className="cpd-v2-field-head">
                  <span>FIELD</span>
                  <span>SOURCE</span>
                  <span>X</span>
                  <span>Y</span>
                  <span>WIDTH</span>
                  <span>HEIGHT</span>
                  <span>FONT</span>
                  <span>STYLE</span>
                  <span />
                </div>

                {config.field_mappings.map((field, index) => (
                  <div className="cpd-v2-field-row" key={field.key || index}>
                    <div className="cpd-v2-field-name">
                      <span className="cpd-v2-field-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <input
                        value={field.label || ""}
                        onChange={(event) =>
                          updateField(index, "label", event.target.value)
                        }
                        placeholder="Field label"
                      />
                    </div>

                    <select
                      value={field.source || ""}
                      onChange={(event) =>
                        updateField(index, "source", event.target.value)
                      }
                    >
                      {SOURCES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={field.x ?? 0}
                      onChange={(event) =>
                        updateField(
                          index,
                          "x",
                          numberValue(event.target.value)
                        )
                      }
                    />

                    <input
                      type="number"
                      value={field.y ?? 0}
                      onChange={(event) =>
                        updateField(
                          index,
                          "y",
                          numberValue(event.target.value)
                        )
                      }
                    />

                    <input
                      type="number"
                      value={field.width ?? 200}
                      onChange={(event) =>
                        updateField(
                          index,
                          "width",
                          numberValue(event.target.value, 200)
                        )
                      }
                    />

                    <input
                      type="number"
                      value={field.height ?? 14}
                      onChange={(event) =>
                        updateField(
                          index,
                          "height",
                          numberValue(event.target.value, 14)
                        )
                      }
                    />

                    <input
                      type="number"
                      min="5"
                      max="72"
                      value={field.fontSize ?? 8}
                      onChange={(event) =>
                        updateField(
                          index,
                          "fontSize",
                          numberValue(event.target.value, 8)
                        )
                      }
                    />

                    <div className="cpd-v2-style-controls">
                      <select
                        value={field.align || "left"}
                        onChange={(event) =>
                          updateField(index, "align", event.target.value)
                        }
                        title="Text alignment"
                      >
                        <option value="left">Left</option>
                        <option value="center">Centre</option>
                        <option value="right">Right</option>
                      </select>

                      <select
                        value={field.fontWeight || "regular"}
                        onChange={(event) =>
                          updateField(
                            index,
                            "fontWeight",
                            event.target.value
                          )
                        }
                        title="Font weight"
                      >
                        <option value="regular">Regular</option>
                        <option value="bold">Bold</option>
                      </select>

                      <label className="cpd-v2-switch">
                        <input
                          type="checkbox"
                          checked={field.enabled !== false}
                          onChange={(event) =>
                            updateField(
                              index,
                              "enabled",
                              event.target.checked
                            )
                          }
                        />
                        <span />
                        Enabled
                      </label>

                      <label className="cpd-v2-switch">
                        <input
                          type="checkbox"
                          checked={field.whiteout === true}
                          onChange={(event) =>
                            updateField(
                              index,
                              "whiteout",
                              event.target.checked
                            )
                          }
                        />
                        <span />
                        Whiteout
                      </label>
                    </div>

                    <button
                      className="cpd-v2-delete"
                      onClick={() => removeField(index)}
                      title={`Remove ${SOURCE_LABEL[field.source] || field.label}`}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {!config.field_mappings.length && (
                  <div className="cpd-v2-no-fields">
                    <strong>No dynamic fields configured.</strong>
                    <span>
                      Add a field to bind project or document data to the
                      template.
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeSection === "revision" && (
            <section className="cpd-v2-section">
              <div className="cpd-v2-section-heading">
                <div>
                  <span className="cpd-v2-section-number">02</span>
                  <div>
                    <h2>Revision History</h2>
                    <p>
                      The generated cover page uses the actual revision
                      records stored in PostgreSQL.
                    </p>
                  </div>
                </div>
              </div>

              <div className="cpd-v2-revision-card">
                <div className="cpd-v2-revision-preview">
                  <div className="cpd-v2-mini-table">
                    <div className="mini-row mini-head">
                      <span>REV</span>
                      <span>DATE</span>
                      <span>DESCRIPTION</span>
                      <span>STATUS</span>
                    </div>
                    <div className="mini-row">
                      <span>A</span>
                      <span>—</span>
                      <span>Issued for Review</span>
                      <span>Review</span>
                    </div>
                    <div className="mini-row">
                      <span>1</span>
                      <span>—</span>
                      <span>Issued for Use</span>
                      <span>Approved</span>
                    </div>
                    <div className="mini-row">
                      <span>2</span>
                      <span>—</span>
                      <span>Current revision</span>
                      <span>Approved</span>
                    </div>
                  </div>
                  <small>
                    Illustration only — generated output uses the real
                    revision history.
                  </small>
                </div>

                <div className="cpd-v2-revision-settings">
                  <div className="cpd-v2-setting-title">
                    <div>
                      <strong>Revision history table</strong>
                      <span>
                        Position and size of the generated table on the PDF.
                      </span>
                    </div>

                    <label className="cpd-v2-large-switch">
                      <input
                        type="checkbox"
                        checked={revisionTable.enabled !== false}
                        onChange={(event) =>
                          updateRevisionTable(
                            "enabled",
                            event.target.checked
                          )
                        }
                      />
                      <span />
                      {revisionTable.enabled !== false ? "Enabled" : "Disabled"}
                    </label>
                  </div>

                  <div className="cpd-v2-settings-grid">
                    <label>
                      <span>X position</span>
                      <input
                        type="number"
                        value={revisionTable.x ?? 45}
                        onChange={(event) =>
                          updateRevisionTable(
                            "x",
                            numberValue(event.target.value, 45)
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>Y position</span>
                      <input
                        type="number"
                        value={revisionTable.y ?? 250}
                        onChange={(event) =>
                          updateRevisionTable(
                            "y",
                            numberValue(event.target.value, 250)
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>Row height</span>
                      <input
                        type="number"
                        value={revisionTable.rowHeight ?? 18}
                        onChange={(event) =>
                          updateRevisionTable(
                            "rowHeight",
                            numberValue(event.target.value, 18)
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>Maximum rows</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={revisionTable.maxRows ?? 8}
                        onChange={(event) =>
                          updateRevisionTable(
                            "maxRows",
                            numberValue(event.target.value, 8)
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "preview" && (
            <section className="cpd-v2-section cpd-v2-preview-section">
              <div className="cpd-v2-section-heading">
                <div>
                  <span className="cpd-v2-section-number">03</span>
                  <div>
                    <h2>Live PDF Preview</h2>
                    <p>
                      Generate the real cover page using the selected
                      document, active project template and current
                      configuration.
                    </p>
                  </div>
                </div>

                <div className="cpd-v2-preview-actions">
                  <button
                    className="cpd-v2-btn secondary"
                    onClick={preview}
                    disabled={!selectedDocumentId || previewLoading}
                  >
                    {previewLoading ? "Generating…" : "Refresh Preview"}
                  </button>

                  <button
                    className="cpd-v2-btn primary"
                    onClick={openPreviewInNewTab}
                    disabled={!previewUrl}
                  >
                    Open PDF
                  </button>
                </div>
              </div>

              {!previewUrl ? (
                <div className="cpd-v2-preview-empty">
                  <div className="cpd-v2-pdf-icon">PDF</div>
                  <h3>Preview not generated yet</h3>
                  <p>
                    Select a document above and click Generate Preview to
                    render the actual server-generated PDF here.
                  </p>
                  <button
                    className="cpd-v2-btn primary"
                    onClick={preview}
                    disabled={!selectedDocumentId || previewLoading}
                  >
                    {previewLoading ? "Generating…" : "Generate Live Preview"}
                  </button>
                </div>
              ) : (
                <div className="cpd-v2-pdf-frame">
                  <div className="cpd-v2-pdf-toolbar">
                    <div>
                      <strong>
                        {selectedDocument?.document_number || "Document"}
                      </strong>
                      <span>
                        {selectedDocument?.title || "Generated cover page"}
                      </span>
                    </div>
                    <button onClick={openPreviewInNewTab}>Open in new tab ↗</button>
                  </div>
                  <iframe
                    title="Live cover page PDF preview"
                    src={previewUrl}
                    className="cpd-v2-pdf-iframe"
                  />
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </section>
  );
}
