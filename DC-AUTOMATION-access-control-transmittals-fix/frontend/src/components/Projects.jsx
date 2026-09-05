import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import ProjectTransmittals from "./ProjectTransmittals";
import "./project.css";

// ============================================================
// PROJECTS
// ============================================================

export default function Projects() {
  const { isAdmin } = useAuth();

  const [projects, setProjects] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    selectedProject,
    setSelectedProject,
  ] = useState(null);

  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    createForm,
    setCreateForm,
  ] = useState({
    project_code: "",
    project_name: "",
    client_name: "",
    description: "",
  });

  // ==========================================================
  // LOAD PROJECTS
  // ==========================================================

  async function loadProjects() {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          `/projects`
        );

      const payload =
        response.data;

      const rows =
        Array.isArray(payload)
          ? payload
          : payload?.projects ||
            payload?.data ||
            payload?.rows ||
            [];

      setProjects(rows);
    } catch (err) {
      console.error(
        "PROJECT LOAD ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load projects."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadProjects();
  }, []);

  // ==========================================================
  // SEARCH
  // ==========================================================

  const filteredProjects =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return projects;
      }

      return projects.filter(
        (project) => {
          return [
            project.project_code,
            project.project_name,
            project.client_name,
            project.description,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query)
            );
        }
      );
    }, [
      projects,
      search,
    ]);

  // ==========================================================
  // CLIENT COUNT
  // ==========================================================

  const clientCount =
    useMemo(() => {
      return new Set(
        projects
          .map(
            (project) =>
              project.client_name
          )
          .filter(Boolean)
      ).size;
    }, [projects]);

  // ==========================================================
  // OPEN PROJECT
  // ==========================================================

  function openProject(project) {
    setSelectedProject(
      project
    );
  }

  // ==========================================================
  // CREATE FORM
  // ==========================================================

  function handleCreateChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setCreateForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  // ==========================================================
  // CREATE PROJECT
  // ==========================================================

  async function handleCreateProject(
    event
  ) {
    event.preventDefault();

    if (!isAdmin) {
      setError("Only administrators can create projects.");
      return;
    }

    const projectCode =
      createForm.project_code.trim();

    const projectName =
      createForm.project_name.trim();

    const clientName =
      createForm.client_name.trim();

    const description =
      createForm.description.trim();

    if (!projectCode) {
      setError(
        "Project code is required."
      );
      return;
    }

    if (!projectName) {
      setError(
        "Project name is required."
      );
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response =
        await api.post(
          `/projects`,
          {
            project_code:
              projectCode,

            project_name:
              projectName,

            client_name:
              clientName,

            description:
              description,
          }
        );

      const createdProject =
        response.data;

      setProjects(
        (current) => [
          createdProject,
          ...current,
        ]
      );

      setCreateForm({
        project_code: "",
        project_name: "",
        client_name: "",
        description: "",
      });

      setShowCreateModal(false);

      if (createdProject) {
        setSelectedProject(
          createdProject
        );
      }
    } catch (err) {
      console.error(
        "CREATE PROJECT ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to create project."
      );
    } finally {
      setCreating(false);
    }
  }

  // ==========================================================
  // CLOSE PROJECT
  // ==========================================================

  function closeProject() {
    setSelectedProject(null);
  }

  // ==========================================================
  // PROJECT DETAILS
  // ==========================================================

  if (selectedProject) {
    return (
      <ProjectDetails
        project={selectedProject}
        onBack={closeProject}
      />
    );
  }

  // ==========================================================
  // MAIN PROJECT PAGE
  // ==========================================================

  return (
    <section className="projects-page">

      <div className="projects-page-header">

        <div>
          <p className="eyebrow">
            PROJECT MANAGEMENT
          </p>

          <h2>
            Projects
          </h2>

          <p className="page-description">
            Create and manage projects,
            documents and project workflows.
          </p>
        </div>

        <div className="projects-header-actions">

          <button
            className="refresh-button"
            onClick={loadProjects}
            disabled={loading}
          >
            ↻ Refresh
          </button>

          {isAdmin && (
            <button
              className="upload-button"
              onClick={() => {
                setError("");

                setCreateForm({
                  project_code: "",
                  project_name: "",
                  client_name: "",
                  description: "",
                });

                setShowCreateModal(true);
              }}
            >
              <span>＋</span>
              New Project
            </button>
          )}

        </div>
      </div>

      {error && (
        <div className="error-banner">

          <strong>
            Error:
          </strong>

          <span>
            {error}
          </span>

          <button
            className="error-close"
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>

        </div>
      )}

      <div className="projects-summary">

        <ProjectMetric
          icon="⌂"
          label="Total Projects"
          value={
            projects.length
          }
        />

        <ProjectMetric
          icon="✓"
          label="Visible Projects"
          value={
            filteredProjects.length
          }
        />

        <ProjectMetric
          icon="◎"
          label="Clients"
          value={
            clientCount
          }
        />

        <ProjectMetric
          icon="↗"
          label="Latest Project"
          value={
            projects[0]
              ?.project_code ||
            "—"
          }
        />

      </div>

      <section className="projects-panel">

        <div className="projects-toolbar">

          <div>
            <h3>
              Existing Projects
            </h3>

            <p>
              Select a project to view
              its complete details.
            </p>
          </div>

          <span className="document-count">
            {filteredProjects.length}
            {" "}
            projects
          </span>

        </div>

        <div className="project-search">

          <span>
            ⌕
          </span>

          <input
            type="text"
            placeholder="Search project code, name or client..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
            >
              ×
            </button>
          )}

        </div>

        {loading && (
          <div className="projects-empty">

            <div className="loading-spinner"></div>

            <strong>
              Loading projects...
            </strong>

            <span>
              Please wait while the
              project list is loaded.
            </span>

          </div>
        )}

        {!loading &&
          filteredProjects.length === 0 && (
            <div className="projects-empty">

              <div className="empty-icon">
                ⌂
              </div>

              <strong>
                {projects.length === 0
                  ? "No projects found"
                  : "No matching projects"}
              </strong>

              <span>
                {projects.length === 0
                  ? "Create your first project to begin."
                  : "Try a different search term."}
              </span>

              {projects.length === 0 && (
                <button
                  className="empty-upload-button"
                  onClick={() =>
                    setShowCreateModal(
                      true
                    )
                  }
                >
                  ＋ Create Project
                </button>
              )}

            </div>
          )}

        {!loading &&
          filteredProjects.length > 0 && (
            <div className="table-container">

              <table className="projects-table">

                <thead>
                  <tr>
                    <th>
                      PROJECT CODE
                    </th>

                    <th>
                      PROJECT
                    </th>

                    <th>
                      CLIENT
                    </th>

                    <th>
                      DESCRIPTION
                    </th>

                    <th>
                      CREATED
                    </th>

                    <th>
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {filteredProjects.map(
                    (project) => (
                      <tr
                        key={
                          project.id
                        }
                      >

                        <td>
                          <span className="project-code-badge">
                            {
                              project.project_code ||
                              `PRJ-${project.id}`
                            }
                          </span>
                        </td>

                        <td>
                          <div className="project-name-cell">

                            <strong>
                              {
                                project.project_name ||
                                "Unnamed Project"
                              }
                            </strong>

                            <span>
                              Project #
                              {
                                project.id
                              }
                            </span>

                          </div>
                        </td>

                        <td>
                          {
                            project.client_name ||
                            "—"
                          }
                        </td>

                        <td>
                          <span className="project-description-cell">
                            {
                              project.description ||
                              "No description"
                            }
                          </span>
                        </td>

                        <td>
                          {
                            formatDate(
                              project.created_at
                            )
                          }
                        </td>

                        <td>
                          <button
                            className="view-button"
                            onClick={() =>
                              openProject(
                                project
                              )
                            }
                          >
                            View →
                          </button>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

      </section>

      {showCreateModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(
            event
          ) => {

            if (
              event.target ===
                event.currentTarget &&
              !creating
            ) {
              setShowCreateModal(
                false
              );
            }

          }}
        >

          <div className="project-modal">

            <div className="modal-header">

              <div>

                <p className="eyebrow">
                  PROJECT MANAGEMENT
                </p>

                <h3>
                  Create New Project
                </h3>

                <p>
                  Create a new project
                  in the document-control
                  system.
                </p>

              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setShowCreateModal(
                    false
                  )
                }
                disabled={creating}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleCreateProject
              }
            >

              <div className="modal-body">

                <div className="form-group">

                  <label>
                    Project Code
                    <span>
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    name="project_code"
                    value={
                      createForm.project_code
                    }
                    onChange={
                      handleCreateChange
                    }
                    placeholder="e.g. PRJ-001"
                    disabled={creating}
                    autoComplete="off"
                  />

                  <small>
                    A unique identifier
                    for this project.
                  </small>

                </div>

                <div className="form-group">

                  <label>
                    Project Name
                    <span>
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    name="project_name"
                    value={
                      createForm.project_name
                    }
                    onChange={
                      handleCreateChange
                    }
                    placeholder="Enter project name"
                    disabled={creating}
                    autoComplete="off"
                  />

                </div>

                <div className="form-group">

                  <label>
                    Client Name
                  </label>

                  <input
                    type="text"
                    name="client_name"
                    value={
                      createForm.client_name
                    }
                    onChange={
                      handleCreateChange
                    }
                    placeholder="Enter client name"
                    disabled={creating}
                    autoComplete="off"
                  />

                </div>

                <div className="form-group">

                  <label>
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={
                      createForm.description
                    }
                    onChange={
                      handleCreateChange
                    }
                    placeholder="Describe the project..."
                    disabled={creating}
                  />

                </div>

                <div className="project-form-info">

                  <span>
                    i
                  </span>

                  <div>

                    <strong>
                      Project setup
                    </strong>

                    <small>
                      After creating the
                      project, you can associate
                      documents, revisions,
                      transmittals and workflow
                      with it.
                    </small>

                  </div>

                </div>

              </div>

              <div className="modal-footer">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowCreateModal(
                      false
                    )
                  }
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="confirm-upload-button"
                  disabled={creating}
                >

                  {creating ? (
                    <>
                      <span className="button-spinner"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Project
                      <span>
                        →
                      </span>
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </section>
  );
}


// ============================================================
// PROJECT DETAILS
// ============================================================

function ProjectDetails({
  project,
  onBack,
}) {

  const [
    activeTab,
    setActiveTab,
  ] = useState("overview");

  const [
    documents,
    setDocuments,
  ] = useState([]);

  const [
    documentsLoading,
    setDocumentsLoading,
  ] = useState(false);

  const [
    documentsError,
    setDocumentsError,
  ] = useState("");

  const [
    selectedDocument,
    setSelectedDocument,
  ] = useState(null);

  // ==========================================================
  // LOAD PROJECT DOCUMENTS
  // ==========================================================

  async function loadDocuments() {
    try {
      setDocumentsLoading(true);
      setDocumentsError("");

      const response =
        await api.get(
          `/documents`,
          {
            params: {
              project_id:
                project.id,
            },
          }
        );

      const payload =
        response.data;

      const rows =
        Array.isArray(payload)
          ? payload
          : payload?.documents ||
            payload?.data ||
            payload?.rows ||
            [];

      setDocuments(rows);
    } catch (err) {
      console.error(
        "PROJECT DOCUMENT ERROR:",
        err
      );

      setDocumentsError(
        err.response?.data?.message ||
          "Unable to load project documents."
      );
    } finally {
      setDocumentsLoading(false);
    }
  }

  // ==========================================================
  // LOAD PROJECT DOCUMENTS
  //
  // Load once when this project is opened, rather than only
  // when the Documents tab is clicked. This is important because
  // the Workflow tab uses the same project document list.
  // ==========================================================

  useEffect(() => {
    // Clear project-specific state before loading the newly selected project.
    setDocuments([]);
    setSelectedDocument(null);

    if (project?.id) {
      loadDocuments();
    }
  }, [project?.id]);

  // ==========================================================
  // DOCUMENT PREFIXES
  // ==========================================================

  const documentGroups =
    useMemo(() => {

      const groups = {};

      documents.forEach(
        (document) => {

          const number =
            String(
              document.document_number ||
              document.document_code ||
              ""
            ).trim();

          if (!number) {
            if (!groups.OTHER) {
              groups.OTHER = [];
            }

            groups.OTHER.push(
              document
            );

            return;
          }

          const prefixMatch =
            number.match(
              /^[A-Za-z]+/
            );

          const prefix =
            prefixMatch
              ? prefixMatch[0].toUpperCase()
              : "OTHER";

          if (!groups[prefix]) {
            groups[prefix] = [];
          }

          groups[prefix].push(
            document
          );
        }
      );

      return groups;

    }, [documents]);

  // ==========================================================
  // DOCUMENT OPEN
  // ==========================================================

  if (selectedDocument) {
    return (
      <DocumentDetails
        document={
          selectedDocument
        }
        project={project}
        onBack={() =>
          setSelectedDocument(null)
        }
      />
    );
  }

  // ==========================================================
  // RETURN
  // ==========================================================

  return (
    <section className="projects-page">

      <div className="project-details-header">

        <div>

          <button
            className="secondary-action-button"
            onClick={onBack}
          >
            ← Back to Projects
          </button>

          <p className="eyebrow">
            PROJECT
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >

            <h3>
              {
                project.project_name ||
                "Unnamed Project"
              }
            </h3>

            <span className="project-code-badge">
              {
                project.project_code ||
                `PRJ-${project.id}`
              }
            </span>

          </div>

          <p>
            {
              project.client_name ||
              "No client specified"
            }
          </p>

        </div>

      </div>

      <div className="project-tabs">

        <button
          className={
            activeTab === "overview"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() =>
            setActiveTab(
              "overview"
            )
          }
        >
          Overview
        </button>

        <button
          className={
            activeTab === "documents"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() =>
            setActiveTab(
              "documents"
            )
          }
        >
          Documents
        </button>

        <button
          className={
            activeTab === "transmittals"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() =>
            setActiveTab(
              "transmittals"
            )
          }
        >
          Transmittals
        </button>

        <button
          className={
            activeTab === "workflow"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() =>
            setActiveTab(
              "workflow"
            )
          }
        >
          Workflow
        </button>

        <button
          className={
            activeTab === "team"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() =>
            setActiveTab(
              "team"
            )
          }
        >
          Team
        </button>

      </div>

      {activeTab === "overview" && (

        <section className="project-details-panel">

          <div className="section-heading">

            <div>

              <h4>
                Project Information
              </h4>

              <p>
                Basic project information.
              </p>

            </div>

          </div>

          <div className="project-details-grid">

            <ProjectDetail
              label="Project Code"
              value={
                project.project_code
              }
            />

            <ProjectDetail
              label="Project Name"
              value={
                project.project_name
              }
            />

            <ProjectDetail
              label="Client"
              value={
                project.client_name
              }
            />

            <ProjectDetail
              label="Project ID"
              value={
                project.id
              }
            />

            <ProjectDetail
              label="Created"
              value={
                formatDateTime(
                  project.created_at
                )
              }
            />

            <ProjectDetail
              label="Updated"
              value={
                formatDateTime(
                  project.updated_at
                )
              }
            />

          </div>

          <div className="project-description-section">

            <div className="section-heading">

              <div>

                <h4>
                  Description
                </h4>

              </div>

            </div>

            <div className="project-description-box">
              {
                project.description ||
                "No project description has been provided."
              }
            </div>

          </div>

        </section>

      )}

      {activeTab === "documents" && (

        <section className="project-details-panel">

          <div className="section-heading">

            <div>

              <p className="eyebrow">
                DOCUMENT CONTROL
              </p>

              <h4>
                Project Documents
              </h4>

              <p>
                Manage the document register,
                prefixes and revisions for this
                project.
              </p>

            </div>

            <div className="documents-header-actions">

              <span className="document-count">
                {documents.length}
                {" "}
                documents
              </span>

              <button
                className="refresh-button"
                onClick={
                  loadDocuments
                }
                disabled={
                  documentsLoading
                }
              >
                ↻ Refresh
              </button>

            </div>

          </div>

          {documentsError && (
            <div className="error-banner">

              <strong>
                Error:
              </strong>

              <span>
                {documentsError}
              </span>

            </div>
          )}

          <DocumentRegister
            documents={
              documents
            }
            documentGroups={
              documentGroups
            }
            loading={
              documentsLoading
            }
            onOpenDocument={
              setSelectedDocument
            }
          />

        </section>

      )}

      {activeTab === "transmittals" && (
        <ProjectTransmittals
          project={project}
        />
      )}

      {activeTab === "workflow" && (
        <ProjectWorkflow
          documents={
            documents
          }
        />
      )}

      {activeTab === "team" && (
        <ProjectTeam />
      )}

    </section>
  );
}


// ============================================================
// DOCUMENT REGISTER
// ============================================================

function DocumentRegister({
  documents,
  documentGroups,
  loading,
  onOpenDocument,
}) {

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    activePrefix,
    setActivePrefix,
  ] = useState("ALL");

  const filteredDocuments =
    useMemo(() => {

      const query =
        search
          .trim()
          .toLowerCase();

      let rows =
        documents;

      if (
        activePrefix !==
        "ALL"
      ) {
        rows =
          documentGroups[
            activePrefix
          ] || [];
      }

      if (!query) {
        return rows;
      }

      return rows.filter(
        (document) => {

          return [
            document.document_number,
            document.document_code,
            document.title,
            document.document_name,
            document.document_type,
            document.vendor_document_number,
            document.customer_document_number,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(value)
                  .toLowerCase()
                  .includes(query)
            );

        }
      );

    }, [
      documents,
      documentGroups,
      search,
      activePrefix,
    ]);

  const prefixes =
    Object.keys(
      documentGroups
    ).sort();

  return (
    <div className="document-register">

      <div className="document-register-toolbar">

        <div className="document-search">

          <span>
            ⌕
          </span>

          <input
            type="text"
            placeholder="Search document number, title or type..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
            >
              ×
            </button>
          )}

        </div>

      </div>

      <div className="document-prefix-tabs">

        <button
          className={
            activePrefix ===
            "ALL"
              ? "document-prefix active"
              : "document-prefix"
          }
          onClick={() =>
            setActivePrefix(
              "ALL"
            )
          }
        >
          ALL
          <span>
            {documents.length}
          </span>
        </button>

        {prefixes.map(
          (prefix) => (
            <button
              key={prefix}
              className={
                activePrefix ===
                prefix
                  ? "document-prefix active"
                  : "document-prefix"
              }
              onClick={() =>
                setActivePrefix(
                  prefix
                )
              }
            >
              {prefix}

              <span>
                {
                  documentGroups[
                    prefix
                  ].length
                }
              </span>

            </button>
          )
        )}

      </div>

      {loading ? (

        <div className="projects-empty">

          <div className="loading-spinner"></div>

          <strong>
            Loading documents...
          </strong>

          <span>
            Reading the project
            document register.
          </span>

        </div>

      ) : filteredDocuments.length === 0 ? (

        <div className="projects-empty">

          <div className="empty-icon">
            ▤
          </div>

          <strong>
            No documents found
          </strong>

          <span>
            {
              documents.length === 0
                ? "No documents are currently associated with this project."
                : "No documents match your current filter."
            }
          </span>

        </div>

      ) : (

        <div className="table-container">

          <table className="projects-table document-register-table">

            <thead>

              <tr>

                <th>
                  DOCUMENT NUMBER
                </th>

                <th>
                  TITLE
                </th>

                <th>
                  TYPE
                </th>

                <th>
                  CURRENT REVISION
                </th>

                <th>
                  STATUS
                </th>

                <th>
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredDocuments.map(
                (document) => (

                  <tr
                    key={
                      document.id
                    }
                  >

                    <td>

                      <div className="document-number-cell">

                        <span className="project-code-badge">
                          {
                            document.document_number ||
                            document.document_code ||
                            `DOC-${document.id}`
                          }
                        </span>

                        <small>
                          ID #
                          {
                            document.id
                          }
                        </small>

                      </div>

                    </td>

                    <td>

                      <div className="project-name-cell">

                        <strong>
                          {
                            document.title ||
                            document.document_name ||
                            "Untitled Document"
                          }
                        </strong>

                        <span>
                          {
                            document.description ||
                            "No description"
                          }
                        </span>

                      </div>

                    </td>

                    <td>
                      {
                        document.document_type ||
                        "—"
                      }
                    </td>

                    <td>

                      <span className="revision-pill">
                        {
                          document.current_revision_code ||
                          document.current_revision ||
                          document.revision_code ||
                          "—"
                        }
                      </span>

                    </td>

                    <td>

                      <StatusBadge
                        status={
                          document.revision_status ||
                          document.status ||
                          document.current_status ||
                          "ACTIVE"
                        }
                      />

                    </td>

                    <td>

                      <button
                        className="view-button"
                        onClick={() =>
                          onOpenDocument(
                            document
                          )
                        }
                      >
                        Details →
                      </button>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}


// ============================================================
// DOCUMENT DETAILS
// ============================================================

function DocumentDetails({
  document,
  project,
  onBack,
}) {

  const [
    revisions,
    setRevisions,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    activeSection,
    setActiveSection,
  ] = useState("overview");

  // ==========================================================
  // LOAD REVISIONS
  // ==========================================================

  async function loadRevisions() {

    try {

      setLoading(true);
      setError("");

      const response =
        await api.get(
          `/revisions/${document.id}`
        );

      const payload =
        response.data;

      const rows =
        Array.isArray(payload)
          ? payload
          : payload?.revisions ||
            payload?.data ||
            payload?.rows ||
            [];

      setRevisions(rows);

    } catch (err) {

      console.error(
        "DOCUMENT REVISION ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load document revisions."
      );

    } finally {

      setLoading(false);

    }
  }

  useEffect(() => {
    loadRevisions();
  }, [
    document.id,
  ]);

  const currentRevision =
    revisions.find(
      (revision) =>
        revision.is_current ===
          true ||
        Number(
          revision.id
        ) ===
          Number(
            document.current_revision_id
          )
    ) ||
    revisions[0] ||
    null;

  return (
    <section className="projects-page">

      <div className="document-details-header">

        <div>

          <button
            className="secondary-action-button"
            onClick={onBack}
          >
            ← Back to Documents
          </button>

          <p className="eyebrow">
            DOCUMENT
          </p>

          <div className="document-title-row">

            <h3>
              {
                document.document_number ||
                document.document_code ||
                `DOC-${document.id}`
              }
            </h3>

            <StatusBadge
              status={
                document.status ||
                document.current_status ||
                "ACTIVE"
              }
            />

          </div>

          <p>
            {
              document.title ||
              document.document_name ||
              "Untitled Document"
            }
          </p>

        </div>

      </div>

      <div className="document-detail-tabs">

        <button
          className={
            activeSection ===
            "overview"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() =>
            setActiveSection(
              "overview"
            )
          }
        >
          Overview
        </button>

        <button
          className={
            activeSection ===
            "revisions"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() =>
            setActiveSection(
              "revisions"
            )
          }
        >
          Revision History
          <span className="tab-count">
            {revisions.length}
          </span>
        </button>

        <button
          className={
            activeSection ===
            "files"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() =>
            setActiveSection(
              "files"
            )
          }
        >
          Files
        </button>

        <button
          className={
            activeSection ===
            "references"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() =>
            setActiveSection(
              "references"
            )
          }
        >
          References
        </button>

      </div>

      {error && (
        <div className="error-banner">

          <strong>
            Error:
          </strong>

          <span>
            {error}
          </span>

        </div>
      )}

      {activeSection ===
        "overview" && (

        <section className="project-details-panel">

          <div className="section-heading">

            <div>

              <p className="eyebrow">
                DOCUMENT INFORMATION
              </p>

              <h4>
                Document Details
              </h4>

            </div>

            <button
              className="refresh-button"
              onClick={
                loadRevisions
              }
              disabled={loading}
            >
              ↻ Refresh
            </button>

          </div>

          <div className="project-details-grid">

            <ProjectDetail
              label="Document Number"
              value={
                document.document_number
              }
            />

            <ProjectDetail
              label="Document Type"
              value={
                document.document_type
              }
            />

            <ProjectDetail
              label="Line Number"
              value={
                document.line_number
              }
            />

            <ProjectDetail
              label="Project"
              value={
                project.project_code ||
                project.project_name
              }
            />

            <ProjectDetail
              label="Customer Document No."
              value={
                document.customer_document_number
              }
            />

            <ProjectDetail
              label="Vendor Document No."
              value={
                document.vendor_document_number
              }
            />

            <ProjectDetail
              label="Current Revision"
              value={
                currentRevision?.revision_code ||
                document.current_revision_code ||
                document.current_revision ||
                "—"
              }
            />

            <ProjectDetail
              label="Created"
              value={
                formatDateTime(
                  document.created_at
                )
              }
            />

          </div>

          <div className="current-revision-card">

            <div>

              <span className="card-eyebrow">
                CURRENT REVISION
              </span>

              <strong>
                {
                  currentRevision?.revision_code ||
                  document.current_revision_code ||
                  document.current_revision ||
                  "Not available"
                }
              </strong>

            </div>

            <StatusBadge
              status={
                currentRevision?.status ||
                currentRevision?.revision_status ||
                document.status ||
                "ACTIVE"
              }
            />

          </div>

        </section>

      )}

      {activeSection ===
        "revisions" && (

        <section className="project-details-panel">

          <div className="section-heading">

            <div>

              <p className="eyebrow">
                DOCUMENT CONTROL
              </p>

              <h4>
                Revision History
              </h4>

              <p>
                Every revision remains
                attached to the same
                document identity.
              </p>

            </div>

            <span className="document-count">
              {revisions.length}
              {" "}
              revisions
            </span>

          </div>

          {loading ? (

            <div className="projects-empty">

              <div className="loading-spinner"></div>

              <strong>
                Loading revisions...
              </strong>

            </div>

          ) : revisions.length ===
            0 ? (

            <div className="projects-empty">

              <div className="empty-icon">
                ↻
              </div>

              <strong>
                No revisions found
              </strong>

              <span>
                This document does not
                currently have revision
                records.
              </span>

            </div>

          ) : (

            <div className="revision-timeline">

              {revisions.map(
                (
                  revision,
                  index
                ) => {

                  const isCurrent =
                    revision.is_current ===
                      true ||
                    Number(
                      revision.id
                    ) ===
                      Number(
                        document.current_revision_id
                      ) ||
                    index === 0;

                  return (
                    <div
                      className={
                        isCurrent
                          ? "revision-card current"
                          : "revision-card"
                      }
                      key={
                        revision.id
                      }
                    >

                      <div className="revision-marker">
                        {isCurrent
                          ? "✓"
                          : index + 1}
                      </div>

                      <div className="revision-content">

                        <div className="revision-header">

                          <div>

                            <span className="card-eyebrow">
                              REVISION
                            </span>

                            <h4>
                              {
                                revision.revision_code ||
                                revision.code ||
                                `Revision ${revision.id}`
                              }
                            </h4>

                          </div>

                          <div className="revision-header-right">

                            {isCurrent && (
                              <span className="current-label">
                                CURRENT
                              </span>
                            )}

                            <StatusBadge
                              status={
                                revision.status ||
                                revision.revision_status ||
                                "ACTIVE"
                              }
                            />

                          </div>

                        </div>

                        <div className="revision-info-grid">

                          <ProjectDetail
                            label="Stage"
                            value={
                              revision.revision_stage ||
                              revision.stage
                            }
                          />

                          <ProjectDetail
                            label="Issued Date"
                            value={
                              formatDate(
                                revision.issued_at ||
                                revision.issue_date ||
                                revision.created_at
                              )
                            }
                          />

                          <ProjectDetail
                            label="Created"
                            value={
                              formatDateTime(
                                revision.created_at
                              )
                            }
                          />

                          <ProjectDetail
                            label="Revision ID"
                            value={
                              revision.id
                            }
                          />

                        </div>

                      </div>

                    </div>
                  );

                }
              )}

            </div>

          )}

        </section>

      )}

      {activeSection ===
        "files" && (

        <section className="project-details-panel">

          <div className="section-heading">

            <div>

              <p className="eyebrow">
                DOCUMENT FILES
              </p>

              <h4>
                Files
              </h4>

              <p>
                Files associated with this
                document will appear here.
              </p>

            </div>

          </div>

          <div className="projects-empty">

            <div className="empty-icon">
              ▤
            </div>

            <strong>
              File management endpoint required
            </strong>

            <span>
              Your current document routes
              expose document records and
              revisions, but no PDF/file
              upload route has been provided
              yet.
            </span>

          </div>

        </section>

      )}

      {activeSection ===
        "references" && (

        <section className="project-details-panel">

          <div className="section-heading">

            <div>

              <p className="eyebrow">
                DOCUMENT RELATIONSHIPS
              </p>

              <h4>
                Reference Documents
              </h4>

              <p>
                Related and referenced
                documents will appear here.
              </p>

            </div>

          </div>

          <div className="projects-empty">

            <div className="empty-icon">
              ◎
            </div>

            <strong>
              No reference data loaded
            </strong>

            <span>
              The current document API
              response does not expose
              reference-document records.
            </span>

          </div>

        </section>

      )}

    </section>
  );
}


// ============================================================
// PROJECT WORKFLOW
// ============================================================

function ProjectWorkflow({
  documents,
}) {

  const [
    selectedDocumentId,
    setSelectedDocumentId,
  ] = useState("");

  const [
    revisions,
    setRevisions,
  ] = useState([]);

  const [
    revisionsLoading,
    setRevisionsLoading,
  ] = useState(false);

  const [
    selectedRevisionId,
    setSelectedRevisionId,
  ] = useState("");

  const [
    workflow,
    setWorkflow,
  ] = useState([]);

  const [
    workflowLoading,
    setWorkflowLoading,
  ] = useState(false);

  const [
    workflowError,
    setWorkflowError,
  ] = useState("");

  // ==========================================================
  // DEFAULT DOCUMENT
  // ==========================================================

  useEffect(() => {

    if (
      documents.length > 0 &&
      !selectedDocumentId
    ) {

      setSelectedDocumentId(
        String(
          documents[0].id
        )
      );

    }

  }, [
    documents,
    selectedDocumentId,
  ]);

  // ==========================================================
  // LOAD REVISIONS
  // ==========================================================

  useEffect(() => {

    if (
      !selectedDocumentId
    ) {

      setRevisions([]);
      setSelectedRevisionId("");

      return;
    }

    loadRevisions(
      selectedDocumentId
    );

  }, [
    selectedDocumentId,
    documents,
  ]);

  async function loadRevisions(
    documentId
  ) {

    try {

      setRevisionsLoading(true);
      setWorkflowError("");

      const response =
        await api.get(
          `/revisions/${documentId}`
        );

      const payload =
        response.data;

      const rows =
        Array.isArray(payload)
          ? payload
          : payload?.revisions ||
            payload?.data ||
            payload?.rows ||
            [];

      setRevisions(rows);

      if (rows.length > 0) {
        const selectedDocument = documents.find(
          (document) =>
            String(document.id) === String(documentId)
        );

        const currentRevisionId =
          selectedDocument?.current_revision_id ||
          selectedDocument?.current_revision_record_id;

        const currentRevision = currentRevisionId
          ? rows.find(
              (revision) =>
                String(revision.id) === String(currentRevisionId)
            )
          : null;

        // Prefer the document's real current revision.
        // If it is not set, use the latest returned revision.
        const defaultRevision =
          currentRevision || rows[rows.length - 1];

        setSelectedRevisionId(
          String(defaultRevision.id)
        );

      } else {

        setSelectedRevisionId("");

      }

    } catch (err) {

      console.error(
        "REVISION LOAD ERROR:",
        err
      );

      setRevisions([]);
      setSelectedRevisionId("");

      setWorkflowError(
        err.response?.data?.message ||
          "Unable to load revisions."
      );

    } finally {

      setRevisionsLoading(false);

    }

  }

  // ==========================================================
  // LOAD SIGNATURE WORKFLOW
  // ==========================================================

  useEffect(() => {

    if (
      !selectedDocumentId ||
      !selectedRevisionId
    ) {

      setWorkflow([]);

      return;
    }

    loadWorkflow();

  }, [
    selectedDocumentId,
    selectedRevisionId,
  ]);

  async function loadWorkflow() {

    try {

      setWorkflowLoading(true);
      setWorkflowError("");

      const response =
        await api.get(
          `/signatures/documents/${selectedDocumentId}/revisions/${selectedRevisionId}/workflow`
        );

      const payload =
        response.data;

      const rows =
        Array.isArray(payload)
          ? payload
          : payload?.workflow ||
            payload?.data ||
            payload?.rows ||
            [];

      setWorkflow(rows);

    } catch (err) {

      console.error(
        "WORKFLOW LOAD ERROR:",
        err
      );

      setWorkflowError(
        err.response?.data?.message ||
          "Unable to load signature workflow."
      );

    } finally {

      setWorkflowLoading(false);

    }

  }

  // ==========================================================
  // CREATE WORKFLOW
  // ==========================================================

  async function createWorkflow() {

    if (
      !selectedDocumentId ||
      !selectedRevisionId
    ) {
      return;
    }

    try {

      setWorkflowLoading(true);
      setWorkflowError("");

      await api.post(
        `/signatures/documents/${selectedDocumentId}/revisions/${selectedRevisionId}/workflow`
      );

      await loadWorkflow();

    } catch (err) {

      console.error(
        "CREATE WORKFLOW ERROR:",
        err
      );

      setWorkflowError(
        err.response?.data?.message ||
          "Unable to create signature workflow."
      );

      setWorkflowLoading(false);

    }

  }

  return (
    <section className="project-details-panel">

      <div className="section-heading">

        <div>

          <h4>
            Signature Workflow
          </h4>

          <p>
            View the signature sequence
            for a document revision.
          </p>

        </div>

        {selectedDocumentId &&
          selectedRevisionId && (

            <button
              className="upload-button"
              onClick={
                createWorkflow
              }
              disabled={
                workflowLoading
              }
            >
              Create Workflow
            </button>

          )}

      </div>

      <div className="workflow-select-grid">

        <div className="form-group">

          <label>
            Document
          </label>

          <select
            value={
              selectedDocumentId
            }
            onChange={(event) =>
              setSelectedDocumentId(
                event.target.value
              )
            }
          >

            <option value="">
              Select document
            </option>

            {documents.map(
              (document) => (

                <option
                  key={
                    document.id
                  }
                  value={
                    document.id
                  }
                >

                  {
                    document.document_number ||
                    document.document_code ||
                    `DOC-${document.id}`
                  }

                  {" — "}

                  {
                    document.title ||
                    document.document_name ||
                    "Untitled"
                  }

                </option>

              )
            )}

          </select>

        </div>

        <div className="form-group">

          <label>
            Revision
          </label>

          <select
            value={
              selectedRevisionId
            }
            onChange={(event) =>
              setSelectedRevisionId(
                event.target.value
              )
            }
            disabled={
              revisionsLoading ||
              revisions.length === 0
            }
          >

            <option value="">
              {
                revisionsLoading
                  ? "Loading revisions..."
                  : "Select revision"
              }
            </option>

            {revisions.map(
              (revision) => (

                <option
                  key={
                    revision.id
                  }
                  value={
                    revision.id
                  }
                >

                  {
                    revision.revision_code ||
                    revision.code ||
                    `Revision ${revision.id}`
                  }

                  {" — "}

                  {
                    revision.revision_stage ||
                    revision.stage ||
                    "REVISION"
                  }

                </option>

              )
            )}

          </select>

        </div>

      </div>

      {workflowError && (
        <div className="error-banner">

          <strong>
            Error:
          </strong>

          <span>
            {workflowError}
          </span>

        </div>
      )}

      {!workflowLoading &&
        workflow.length === 0 && (

          <div className="projects-empty">

            <div className="empty-icon">
              ✓
            </div>

            <strong>
              No signature workflow
            </strong>

            <span>
              Select a document and
              revision, then create or
              load its workflow.
            </span>

          </div>

        )}

      {workflowLoading && (

        <div className="projects-empty">

          <div className="loading-spinner"></div>

          <strong>
            Loading workflow...
          </strong>

        </div>

      )}

      {!workflowLoading &&
        workflow.length > 0 && (

          <div className="workflow-list">

            {workflow.map(
              (
                step,
                index
              ) => (

                <div
                  className="workflow-step"
                  key={
                    step.id ||
                    step.document_signature_id ||
                    index
                  }
                >

                  <div className="workflow-step-number">
                    {
                      index + 1
                    }
                  </div>

                  <div className="workflow-step-content">

                    <div className="workflow-step-header">

                      <div>

                        <span className="workflow-step-label">
                          SIGNATURE STEP
                        </span>

                        <h4>
                          {
                            step.signature_role ||
                            step.role ||
                            "Signature"
                          }
                        </h4>

                      </div>

                      <StatusBadge
                        status={
                          step.signature_status ||
                          step.status ||
                          "PENDING"
                        }
                      />

                    </div>

                    <div className="workflow-step-info">

                      <div>

                        <label>
                          Assigned User
                        </label>

                        <strong>

                          {
                            step.user_name ||
                            step.assigned_user_name ||
                            step.assigned_user ||
                            (
                              step.assigned_user_id
                                ? `User #${step.assigned_user_id}`
                                : "Not assigned"
                            )
                          }

                        </strong>

                      </div>

                      <div>

                        <label>
                          Required
                        </label>

                        <strong>
                          {
                            step.is_required === false
                              ? "NO"
                              : "YES"
                          }
                        </strong>

                      </div>

                      <div>

                        <label>
                          Status
                        </label>

                        <strong>
                          {
                            step.signature_status ||
                            step.status ||
                            "PENDING"
                          }
                        </strong>

                      </div>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

    </section>
  );
}


// ============================================================
// PROJECT TEAM
// ============================================================

function ProjectTeam() {

  return (
    <section className="project-details-panel">

      <div className="section-heading">

        <div>

          <h4>
            Project Team
          </h4>

          <p>
            Project users and role
            assignments.
          </p>

        </div>

      </div>

      <div className="projects-empty">

        <div className="empty-icon">
          ◎
        </div>

        <strong>
          User assignment backend not available yet
        </strong>

        <span>
          Your current backend exposes
          assigned users inside signature
          workflow records, but it does
          not currently expose a project
          team/user-assignment route.
        </span>

      </div>

    </section>
  );
}


// ============================================================
// PROJECT METRIC
// ============================================================

function ProjectMetric({
  icon,
  label,
  value,
}) {

  return (
    <div className="project-metric">

      <div className="project-metric-icon">
        {icon}
      </div>

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}


// ============================================================
// PROJECT DETAIL
// ============================================================

function ProjectDetail({
  label,
  value,
}) {

  return (
    <div className="project-detail-item">

      <label>
        {label}
      </label>

      <strong>
        {value || "—"}
      </strong>

    </div>
  );
}


// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({
  status,
}) {

  const normalized =
    String(
      status ||
      "UNKNOWN"
    ).toUpperCase();

  let className =
    "status-badge neutral";

  if (
    [
      "ACTIVE",
      "APPROVED",
      "COMPLETED",
      "SIGNED",
      "ANALYSED",
      "ANALYZED",
      "PROCESSED",
      "CURRENT",
    ].includes(
      normalized
    )
  ) {
    className =
      "status-badge success";
  }

  if (
    [
      "PENDING",
      "SUBMITTED",
      "WAITING",
      "UPLOADED",
      "REVIEW",
      "IN_PROGRESS",
      "IN PROGRESS",
    ].includes(
      normalized
    )
  ) {
    className =
      "status-badge warning";
  }

  if (
    [
      "FAILED",
      "REJECTED",
      "ERROR",
      "BLOCKED",
    ].includes(
      normalized
    )
  ) {
    className =
      "status-badge danger";
  }

  return (
    <span
      className={
        className
      }
    >
      {
        normalized
          .replaceAll(
            "_",
            " "
          )
      }
    </span>
  );
}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(
  value
) {

  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(
      value
    );
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


// ============================================================
// FORMAT DATE + TIME
// ============================================================

function formatDateTime(
  value
) {

  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(
      value
    );
  }

  return date.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}