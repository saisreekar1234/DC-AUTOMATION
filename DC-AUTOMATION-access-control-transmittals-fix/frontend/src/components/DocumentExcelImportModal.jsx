import { useEffect, useRef, useState } from "react";
import api from "../api";
import "./document-excel-import.css";

export default function DocumentExcelImportModal({
  projectId = null,
  onClose,
  onImported,
}) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    projectId?.id || projectId || ""
  );
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (selectedProjectId) return;

    async function loadProjects() {
      try {
        const response = await api.get("/projects");
        const payload = response.data;
        const rows = Array.isArray(payload)
          ? payload
          : payload?.projects || payload?.data || [];
        setProjects(rows);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load projects."
        );
      }
    }

    loadProjects();
  }, [selectedProjectId]);

  function setSelectedFile(selected) {
    if (!selected) return;

    if (!/\.(xlsx|xls|xlsm)$/i.test(selected.name)) {
      setFile(null);
      setError("Only .xlsx, .xls and .xlsm files are allowed.");
      setResult(null);
      return;
    }

    if (selected.size > 25 * 1024 * 1024) {
      setFile(null);
      setError("The Excel file must be 25 MB or smaller.");
      setResult(null);
      return;
    }

    setFile(selected);
    setError("");
    setResult(null);
  }

  function chooseFile(event) {
    setSelectedFile(event.target.files?.[0] || null);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!uploading) setDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (uploading) return;

    const droppedFile = event.dataTransfer.files?.[0];
    if (!droppedFile) return;

    setSelectedFile(droppedFile);
  }

  async function handleImport() {
    if (!selectedProjectId) {
      setError("Please select a project.");
      return;
    }

    if (!file) {
      setError("Please select an Excel file.");
      return;
    }

    const allowed = /\.(xlsx|xls|xlsm)$/i.test(file.name);
    if (!allowed) {
      setError("Only .xlsx, .xls and .xlsm files are allowed.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("project_id", String(selectedProjectId));

      const response = await api.post(
        "/documents/import-excel",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(response.data);

      if (onImported) {
        await onImported();
      }
    } catch (err) {
      console.error("DOCUMENT EXCEL IMPORT ERROR:", err);
      setError(
        err.response?.data?.message ||
          "Failed to import the document register."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="excel-import-overlay" onMouseDown={onClose}>
      <section
        className="excel-import-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="excel-import-header">
          <div>
            <span className="excel-import-eyebrow">
              DOCUMENT REGISTER
            </span>
            <h2>Import MDR / Excel</h2>
            <p>
              Import your project MDR and create or update the controlled
              document register without creating duplicate revisions.
            </p>
          </div>

          <button
            type="button"
            className="excel-import-close"
            onClick={onClose}
            disabled={uploading}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="excel-import-body">
          <label className="excel-import-field">
            <span>Project</span>

            {projectId ? (
              <div className="excel-project-fixed">
                Project #{selectedProjectId}
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(event) =>
                  setSelectedProjectId(event.target.value)
                }
                disabled={uploading}
              >
                <option value="">Select project</option>

                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_code
                      ? `${project.project_code} — ${project.project_name}`
                      : project.project_name || `Project ${project.id}`}
                  </option>
                ))}
              </select>
            )}
          </label>

          <div
            className={`excel-dropzone${dragActive ? " is-dragging" : ""}${file ? " has-file" : ""}`}
            role="button"
            tabIndex={uploading ? -1 : 0}
            onClick={() => !uploading && inputRef.current?.click()}
            onKeyDown={(event) => {
              if (!uploading && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              onChange={chooseFile}
              disabled={uploading}
            />

            <div className="excel-file-icon">{file ? "✓" : "XLS"}</div>

            <strong>
              {file ? file.name : "Drag & drop your MDR Excel file here"}
            </strong>

            <span>
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · Click to replace`
                : "or click to browse · XLSX, XLS or XLSM · maximum 25 MB"}
            </span>
          </div>

          <div className="excel-import-info">
            <strong>Fields imported from the MDR</strong>

            <div className="excel-import-tags">
              <span>Document Number</span>
              <span>Document Title</span>
              <span>Supplier / Vendor Number</span>
              <span>Customer Document Number</span>
              <span>Revision Number</span>
              <span>Current Status</span>
              <span>Document Type</span>
              <span>Discipline</span>
            </div>
          </div>

          <div className="excel-import-note">
            <strong>Safe import:</strong>
            Existing documents are updated. Existing revisions are not
            duplicated. A revision supplied by the MDR is imported as an
            actual database revision and becomes the document's current
            revision.
          </div>

          {error && (
            <div className="excel-import-error">
              {error}
            </div>
          )}

          {result && (
            <div className="excel-import-success">
              <strong>Import completed successfully</strong>

              <div className="excel-result-grid">
                <span>Rows processed</span>
                <b>{result.total_rows ?? 0}</b>

                <span>Documents created</span>
                <b>{result.created_documents ?? 0}</b>

                <span>Documents updated</span>
                <b>{result.updated_documents ?? 0}</b>

                <span>Revisions imported</span>
                <b>{result.created_revisions ?? 0}</b>

                <span>Existing revisions</span>
                <b>{result.unchanged_revisions ?? 0}</b>

                <span>Rows skipped</span>
                <b>{result.skipped_rows ?? 0}</b>
              </div>
            </div>
          )}
        </div>

        <footer className="excel-import-footer">
          <button
            type="button"
            className="excel-secondary-button"
            onClick={onClose}
            disabled={uploading}
          >
            {result ? "Close" : "Cancel"}
          </button>

          {!result && (
            <button
              type="button"
              className="excel-primary-button"
              onClick={handleImport}
              disabled={uploading || !file || !selectedProjectId}
            >
              {uploading ? "Importing MDR..." : "Import Document Register"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
