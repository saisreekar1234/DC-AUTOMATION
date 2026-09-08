import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import CoverPageDesigner from "./CoverPageDesigner";
import "./project-cover-page.css";

export default function ProjectCoverPageSettings({ project }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [designerOpen, setDesignerOpen] = useState(false);

  async function loadTemplate() {
    if (!project?.id) return;
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/project-cover-page-templates/${project.id}`);
      setTemplate(response.data?.template || response.data || null);
    } catch (err) {
      if (err.response?.status === 404) {
        setTemplate(null);
        return;
      }
      setError(err.response?.data?.message || "Unable to load the project cover-page template.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTemplate(); }, [project?.id]);

  async function uploadTemplate(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setSuccess("");
    if (file.type !== "application/pdf") return setError("Only PDF files are allowed for the cover-page template.");
    if (file.size > 20 * 1024 * 1024) return setError("The cover-page template must be smaller than 20 MB.");
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("template", file);
      const response = await api.post(`/project-cover-page-templates/${project.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setTemplate(response.data?.template || response.data || null);
      setSuccess(template ? "Cover-page template replaced successfully." : "Cover-page template uploaded successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload the cover-page template.");
    } finally {
      setUploading(false);
    }
  }

  if (designerOpen) {
    return <CoverPageDesigner project={project} onClose={() => setDesignerOpen(false)} />;
  }

  return (
    <section className="project-details-panel cover-page-settings-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">DOCUMENT CONTROL</p>
          <h4>Project Cover Page</h4>
          <p>One controlled template for this project. The system writes document and revision data into the configured locations.</p>
        </div>
        {isAdmin && template && (
          <button type="button" className="upload-button" onClick={() => setDesignerOpen(true)}>Open Designer</button>
        )}
      </div>

      {error && <div className="cover-template-alert error"><strong>Error</strong><span>{error}</span></div>}
      {success && <div className="cover-template-alert success"><strong>Success</strong><span>{success}</span></div>}

      {loading ? (
        <div className="cover-template-empty"><div className="cover-template-spinner" /><strong>Loading template...</strong><span>Checking the active template for this project.</span></div>
      ) : (
        <div className="cover-template-card">
          <div className="cover-template-icon">PDF</div>
          <div className="cover-template-main">
            <div className="cover-template-title-row">
              <div><span className="cover-template-label">ACTIVE PROJECT TEMPLATE</span><h5>{template?.template_name || "No template configured"}</h5></div>
              <span className={template ? "cover-template-status configured" : "cover-template-status missing"}>{template ? "Configured" : "Not configured"}</span>
            </div>
            {template ? (
              <div className="cover-template-details">
                <div><label>Version</label><strong>{template.template_version || "1"}</strong></div>
                <div><label>Updated</label><strong>{template.updated_at ? new Date(template.updated_at).toLocaleDateString("en-GB") : "—"}</strong></div>
                <div><label>Configuration</label><strong>Designer available</strong></div>
              </div>
            ) : (
              <p className="cover-template-description">Upload the approved blank cover-page PDF for {project.project_code}. Do not upload a completed document containing real signatures or controlled revision data as the production template.</p>
            )}
          </div>
          {isAdmin && (
            <div className="cover-template-actions">
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={uploadTemplate} hidden />
              <button type="button" className="upload-button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? "Uploading..." : template ? "Replace Template" : "Upload Template"}</button>
            </div>
          )}
        </div>
      )}

      <div className="cover-template-info">
        <span>i</span>
        <div>
          <strong>Administration-controlled configuration</strong>
          <p>Administrators configure the project template and field locations. Normal project users can generate cover pages but cannot alter the project layout or data bindings.</p>
        </div>
      </div>
    </section>
  );
}
