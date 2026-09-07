import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./project-cover-page.css";

export default function ProjectCoverPageSettings({ project }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // The backend is the final authority for project access.
  // Admins can access every project; project members can access
  // projects assigned to them.
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  async function loadTemplate() {
    if (!project?.id) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/project-cover-page-templates/${project.id}`
      );

      setTemplate(response.data?.template || response.data || null);
    } catch (err) {
      if (err.response?.status === 404) {
        setTemplate(null);
        return;
      }

      console.error("LOAD COVER PAGE TEMPLATE ERROR:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load the project cover-page template."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplate();
  }, [project?.id]);

  async function uploadTemplate(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");
    setSuccess("");

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed for the cover-page template.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("The cover-page template must be smaller than 20 MB.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("template", file);

      const response = await api.post(
        `/project-cover-page-templates/${project.id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setTemplate(response.data?.template || response.data || null);
      setSuccess(
        template
          ? "Cover-page template replaced successfully."
          : "Cover-page template uploaded successfully."
      );
    } catch (err) {
      console.error("UPLOAD COVER PAGE TEMPLATE ERROR:", err);
      setError(
        err.response?.data?.message ||
          "Unable to upload the cover-page template."
      );
    } finally {
      setUploading(false);
    }
  }

  function openFilePicker() {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  }

  return (
    <section className="project-details-panel cover-page-settings-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">DOCUMENT CONTROL</p>
          <h4>Cover Page Template</h4>
          <p>
            Configure the project-specific PDF template used when generating
            document cover pages.
          </p>
        </div>
      </div>

      {error && (
        <div className="cover-template-alert error">
          <strong>Error</strong>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="cover-template-alert success">
          <strong>Success</strong>
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="cover-template-empty">
          <div className="cover-template-spinner" />
          <strong>Loading template...</strong>
          <span>Checking the template configured for this project.</span>
        </div>
      ) : (
        <div className="cover-template-card">
          <div className="cover-template-icon">PDF</div>

          <div className="cover-template-main">
            <div className="cover-template-title-row">
              <div>
                <span className="cover-template-label">PROJECT TEMPLATE</span>
                <h5>{template?.template_name || "No template configured"}</h5>
              </div>

              <span
                className={
                  template
                    ? "cover-template-status configured"
                    : "cover-template-status missing"
                }
              >
                {template ? "Configured" : "Not configured"}
              </span>
            </div>

            {template ? (
              <div className="cover-template-details">
                <div>
                  <label>File</label>
                  <strong>{template.template_name || "cover-page.pdf"}</strong>
                </div>
                <div>
                  <label>Version</label>
                  <strong>{template.template_version || "1"}</strong>
                </div>
                <div>
                  <label>Updated</label>
                  <strong>
                    {template.updated_at
                      ? new Date(template.updated_at).toLocaleDateString("en-GB")
                      : "—"}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="cover-template-description">
                No cover-page template has been uploaded for {project.project_code}.
                Upload the approved blank PDF template for this project.
              </p>
            )}
          </div>

          {/* Every user with access to this project can upload/replace.
              The backend also enforces this permission. */}
          <div className="cover-template-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={uploadTemplate}
              hidden
            />

            <button
              type="button"
              className="upload-button"
              onClick={openFilePicker}
              disabled={uploading}
            >
              {uploading
                ? "Uploading..."
                : template
                  ? "Replace Template"
                  : "Upload Template"}
            </button>
          </div>
        </div>
      )}

      <div className="cover-template-info">
        <span>i</span>
        <div>
          <strong>Project access controls the upload permission</strong>
          <p>
            Administrators can manage every project. A user with permission to
            this project can also upload or replace its cover-page template.
            The template must be an approved blank PDF containing the project's
            permanent layout, borders, logos and headings. Live document values
            are populated by the system.
          </p>
        </div>
      </div>
    </section>
  );
}
