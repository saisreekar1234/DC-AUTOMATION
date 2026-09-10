import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api";

export default function Documents({ projectId = null }) {

  // ==========================================================
  // DOCUMENT STATE
  // ==========================================================

  const [documents, setDocuments] =
    useState([]);

  const [projects, setProjects] =
    useState([]);

  const [projectsLoading, setProjectsLoading] =
    useState(false);

  const [
    selectedDocument,
    setSelectedDocument,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");


  // ==========================================================
  // FILTER STATE
  // ==========================================================

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    projectFilter,
    setProjectFilter,
  ] = useState("ALL");


  // ==========================================================
  // LOAD DOCUMENTS
  // ==========================================================

  async function loadDocuments() {

    try {

      setLoading(true);
      setError("");

      // Global Documents page:
      //   GET /documents
      //
      // Project Details page:
      //   GET /documents?project_id=<actual project id>
      //
      // IMPORTANT:
      // Never use a hard-coded project ID here.
      const scopedProjectId =
        projectId?.id ??
        projectId ??
        null;

      const response =
        await api.get(
          "/documents",
          scopedProjectId !== null && scopedProjectId !== undefined
            ? {
                params: {
                  project_id: scopedProjectId,
                },
              }
            : undefined
        );

      const payload =
        response.data;

      /*
       * Support:
       *
       * [
       *   {...}
       * ]
       *
       * OR
       *
       * {
       *   documents: [...]
       * }
       *
       * OR
       *
       * {
       *   data: [...]
       * }
       */

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
        "LOAD DOCUMENTS ERROR:",
        err
      );

      setDocuments([]);

      setError(
        err.response?.data?.message ||
        "Unable to load documents."
      );

    } finally {

      setLoading(false);

    }
  }


  // ==========================================================
  // OPEN DOCUMENT DETAILS
  // ==========================================================

  async function openDocument(id) {

    try {

      setDetailsLoading(true);
      setError("");

      /*
       * REAL BACKEND ROUTE:
       *
       * GET /api/documents/:id
       */

      const response =
        await api.get(
          `/documents/${id}`
        );

      const payload =
        response.data;

      const document =
        payload?.document ||
        payload?.data ||
        payload;

      setSelectedDocument(
        document
      );

    } catch (err) {

      console.error(
        "LOAD DOCUMENT DETAILS ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
        "Unable to load document details."
      );

    } finally {

      setDetailsLoading(false);

    }
  }


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    async function loadProjects() {
      try {
        setProjectsLoading(true);

        const response = await api.get("/projects");
        const payload = response.data;

        const rows =
          Array.isArray(payload)
            ? payload
            : payload?.projects ||
              payload?.data ||
              payload?.rows ||
              [];

        const normalized = rows
          .map((project) => ({
            id: project.id,
            code: project.project_code || `Project ${project.id}`,
            name: project.project_name || "",
          }))
          .filter((project) => project.id !== null && project.id !== undefined);

        setProjects(normalized);
      } catch (err) {
        console.error("LOAD PROJECTS ERROR:", err);
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    }

    loadProjects();
    loadDocuments();

  }, [projectId]);


  // ==========================================================
  // PROJECT-SCOPED MODE
  // ==========================================================

  const scopedProjectId =
    projectId?.id ??
    projectId ??
    null;

  const isProjectScoped =
    scopedProjectId !== null &&
    scopedProjectId !== undefined;

  useEffect(() => {
    if (isProjectScoped) {
      setProjectFilter(String(scopedProjectId));
    } else {
      setProjectFilter("ALL");
    }
  }, [isProjectScoped, scopedProjectId]);


  // ==========================================================
  // STATUS FILTER OPTIONS
  // ==========================================================


  const statuses = useMemo(() => {
    const standardStatuses = [
      "PENDING",
      "SUBMITTED",
      "UNDER_REVIEW",
      "COMMENTED",
      "APPROVED",
      "REJECTED",
      "COMPLETED",
      "IN_PROGRESS",
      "FAILED",
    ];

    const backendStatuses = documents
      .map((document) => getDocumentStatus(document))
      .filter(
        (status) =>
          status &&
          status !== "UNKNOWN"
      );

    return [
      ...new Set([
        ...standardStatuses,
        ...backendStatuses,
      ]),
    ];
  }, [documents]);


  // ==========================================================
  // FILTER DOCUMENTS
  // ==========================================================

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return documents.filter((document) => {
      const searchableValues = [
        document.document_number,
        document.customer_document_number,
        document.vendor_document_number,
        document.title,
        document.description,
        document.project_code,
        document.project_name,
        document.line_number,
      ]
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).toLowerCase());

      const matchesSearch =
        !query || searchableValues.some((value) => value.includes(query));

      const matchesProject =
        projectFilter === "ALL" ||
        String(document.project_id) === String(projectFilter);

      const status = getDocumentStatus(document);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [
    documents,
    search,
    projectFilter,
    statusFilter,
  ]);


  // ==========================================================
  // RESET FILTERS
  // ==========================================================

  function resetFilters() {

    setSearch("");

    setProjectFilter(
      isProjectScoped
        ? String(scopedProjectId)
        : "ALL"
    );

    setStatusFilter("ALL");

  }


  // ==========================================================
  // ADD DOCUMENT
  // ==========================================================

  function handleAddDocument() {

    alert(
      "Document creation will be connected to your existing backend."
    );

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <section className="documents-page">

      {/* ====================================================
          ERROR
          ==================================================== */}

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


      {/* ====================================================
          SUMMARY CARDS
          ==================================================== */}

      <div className="documents-summary">

        <DocumentMetric
          label="Total Documents"
          value={
            documents.length
          }
          icon="▤"
        />

        <DocumentMetric
          label="Visible"
          value={
            filteredDocuments.length
          }
          icon="◉"
        />

        <DocumentMetric
          label="Projects"
          value={
            projects.length
          }
          icon="⌂"
        />

        <DocumentMetric
          label="Current Revisions"
          value={
            documents.filter(
              (item) =>
                item.current_revision_record_id ||
                item.current_revision_code ||
                item.current_revision_id ||
                item.revision_code
            ).length
          }
          icon="✓"
        />

      </div>


      {/* ====================================================
          DOCUMENT REGISTER
          ==================================================== */}

      <section className="panel documents-panel">

        <div className="documents-toolbar">

          <div>

            <h3>
              Document Register
            </h3>

            <p>
              Search and review
              project documents.
            </p>

          </div>


          <div className="documents-toolbar-actions">

            <span className="document-count">
              {filteredDocuments.length}{" "}
              documents
            </span>

            <button
              className="upload-button"
              onClick={
                handleAddDocument
              }
            >
              <span>
                ＋
              </span>

              Add Document
            </button>

          </div>

        </div>


        {/* ==================================================
            FILTERS
            ================================================== */}

        <div className="document-filters">

          {/* SEARCH */}

          <div className="document-search">

            <span>
              ⌕
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search document number, title..."
            />

            {search && (

              <button
                onClick={() =>
                  setSearch("")
                }
              >
                ×
              </button>

            )}

          </div>


          {/* PROJECT */}

          {!isProjectScoped && (
            <select
              value={
                projectFilter
              }
              onChange={(event) =>
                setProjectFilter(
                  event.target.value
                )
              }
            >

              <option value="ALL">
                All Projects
              </option>

              {projects.map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                >
                  {project.code}
                  {project.name ? ` — ${project.name}` : ""}
                </option>
              ))}

            </select>
          )}


          {/* STATUS */}

          <select
            value={
              statusFilter
            }
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >

            <option value="ALL">
              All Statuses
            </option>

            {statuses.map(
              (status) => (

                <option
                  key={status}
                  value={status}
                >
                  {formatStatus(
                    status
                  )}
                </option>

              )
            )}

          </select>


          {/* RESET */}

          {(search ||
            projectFilter !==
              "ALL" ||
            statusFilter !==
              "ALL") && (

            <button
              className="reset-filter-button"
              onClick={
                resetFilters
              }
            >
              Reset
            </button>

          )}

        </div>


        {/* ==================================================
            DOCUMENT TABLE
            ================================================== */}

        {loading ? (

          <div className="documents-empty">

            <div className="loading-spinner"></div>

            <strong>
              Loading documents...
            </strong>

          </div>

        ) : filteredDocuments.length ===
          0 ? (

          <div className="documents-empty">

            <div className="empty-icon">
              ▤
            </div>

            <strong>
              No documents found
            </strong>

            <span>
              {documents.length ===
              0
                ? "No documents are available in your accessible projects."
                : "Try changing your search or filters."
              }
            </span>

          </div>

        ) : (

          <div className="table-container">

            <table className="documents-table">

              <thead>

                <tr>

                  <th>
                    Document Number
                  </th>

                  <th>
                    Title
                  </th>

                  <th>
                    Customer Document
                  </th>

                  <th>
                    Project
                  </th>

                  <th>
                    Revision
                  </th>

                  <th>
                    Stage
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Updated
                  </th>

                  <th></th>

                </tr>

              </thead>


              <tbody>

                {filteredDocuments.map(
                  (document) => (

                    <DocumentRow
                      key={
                        document.id
                      }
                      document={
                        document
                      }
                      onView={() =>
                        openDocument(
                          document.id
                        )
                      }
                    />

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* ====================================================
          DETAILS LOADING
          ==================================================== */}

      {detailsLoading && (

        <section className="panel document-details-panel">

          <div className="documents-empty">

            <div className="loading-spinner"></div>

            Loading document
            details...

          </div>

        </section>

      )}


      {/* ====================================================
          DOCUMENT DETAILS
          ==================================================== */}

      {selectedDocument &&
        !detailsLoading && (

          <DocumentDetails
            document={
              selectedDocument
            }
            onClose={() =>
              setSelectedDocument(
                null
              )
            }
          />

        )}

    </section>

  );
}


// ============================================================
// DOCUMENT ROW
// ============================================================

function DocumentRow({
  document,
  onView,
}) {

  const status = getDocumentStatus(document);

  const stage =
    document.current_revision_stage ??
    document.current_revision_stage_value ??
    document.revision_stage ??
    document.stage ??
    "—";

  return (

    <tr>

      {/* DOCUMENT NUMBER */}

      <td>

        <div className="document-number-cell">

          <strong>
            {document.document_number ||
              "—"}
          </strong>

          <span>
            ID #{document.id}
          </span>

        </div>

      </td>


      {/* TITLE */}

      <td>

        <div className="document-title-cell">

          <strong>
            {document.title ||
              "Untitled document"}
          </strong>

        </div>

      </td>


      {/* CUSTOMER DOCUMENT */}

      <td>

        <span className="customer-document-number">

          {document.customer_document_number ||
            "—"}

        </span>

      </td>


      {/* PROJECT */}

      <td>

        <span className="project-badge">

          {document.project_code ||
            document.project_name ||
            document.project_id ||
            "—"}

        </span>

      </td>


      {/* REVISION */}

      <td>

        <span className="revision-badge">

          {document.current_revision_code ||
            document.revision_code ||
            document.revision ||
            "—"}

        </span>

      </td>


      {/* STAGE */}

      <td>

        <StageBadge
          stage={stage}
        />

      </td>


      {/* STATUS */}

      <td>

        <DocumentStatus
          status={status}
        />

      </td>


      {/* UPDATED */}

      <td>

        <span className="updated-date">

          {formatDate(
            document.updated_at
          )}

        </span>

      </td>


      {/* VIEW */}

      <td>

        <button
          className="view-button"
          onClick={onView}
        >
          View →
        </button>

      </td>

    </tr>

  );
}


// ============================================================
// DOCUMENT DETAILS
// ============================================================

function DocumentDetails({
  document,
  onClose,
}) {

  // ==========================================================
  // REVISION HISTORY
  // ==========================================================

  const [
    revisions,
    setRevisions,
  ] = useState([]);

  const [
    loadingRevisions,
    setLoadingRevisions,
  ] = useState(true);


  // ==========================================================
  // CURRENT REVISION
  // ==========================================================

  const [
    currentRevision,
    setCurrentRevision,
  ] = useState(null);

  const [
    loadingCurrentRevision,
    setLoadingCurrentRevision,
  ] = useState(true);

  const [
    coverPageLoading,
    setCoverPageLoading,
  ] = useState(false);


  // ==========================================================
  // LOAD REVISION HISTORY
  // ==========================================================

  useEffect(() => {

    async function loadRevisions() {

      try {

        setLoadingRevisions(
          true
        );

        /*
         * REAL BACKEND ROUTE:
         *
         * GET /api/revisions/:documentId
         */

        const response =
          await api.get(
            `/revisions/${document.id}`
          );

        const payload =
          response.data;

        const rows =
          Array.isArray(
            payload
          )
            ? payload
            : payload?.revisions ||
              payload?.data ||
              [];

        setRevisions(
          rows
        );

      } catch (error) {

        console.error(
          "LOAD REVISION HISTORY ERROR:",
          error
        );

        setRevisions([]);

      } finally {

        setLoadingRevisions(
          false
        );

      }

    }


    if (document?.id) {

      loadRevisions();

    }

  }, [document]);


  // ==========================================================
  // LOAD CURRENT REVISION
  // ==========================================================

  useEffect(() => {

    async function loadCurrentRevision() {

      try {

        setLoadingCurrentRevision(
          true
        );

        /*
         * REAL BACKEND ROUTE:
         *
         * GET /api/documents/:id/current-revision
         */

        const response =
          await api.get(
            `/documents/${document.id}/current-revision`
          );

        const payload =
          response.data;

        const revision =
          payload?.revision ||
          payload?.current_revision ||
          payload?.data ||
          payload;

        setCurrentRevision(
          revision
        );

      } catch (error) {

        console.error(
          "LOAD CURRENT REVISION ERROR:",
          error
        );

        /*
         * If the endpoint doesn't return
         * a current revision, fall back
         * to what came with the document.
         */

        setCurrentRevision(
          null
        );

      } finally {

        setLoadingCurrentRevision(
          false
        );

      }

    }


    if (document?.id) {

      loadCurrentRevision();

    }

  }, [document]);


  // ==========================================================
  // GENERATE COVER PAGE PDF
  // ==========================================================

  async function generateCoverPage() {

    // Open the tab immediately so the browser does not block it
    // as a popup after the asynchronous API request.
    const pdfWindow = window.open("", "_blank");

    try {

      setCoverPageLoading(true);

      const response = await api.get(
        `/documents/${document.id}/cover-page`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type: "application/pdf",
        }
      );

      const url = URL.createObjectURL(blob);

      if (pdfWindow) {
        pdfWindow.location.href = url;
      } else {
        window.open(url, "_blank");
      }

      // Keep the object URL alive long enough for the PDF viewer
      // to load it, then release it from browser memory.
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);

    } catch (error) {

      console.error(
        "GENERATE COVER PAGE ERROR:",
        error
      );

      if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.close();
      }

      let message =
        error.response?.data?.message ||
        "Unable to generate the cover page PDF.";

      // Axios returns an error body as a Blob when responseType is blob.
      // Try to extract the backend error message when available.
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const payload = JSON.parse(text);
          message = payload?.message || message;
        } catch {
          // Keep the default message if the error body is not JSON.
        }
      }

      alert(message);

    } finally {

      setCoverPageLoading(false);

    }
  }


  // ==========================================================
  // CURRENT REVISION CODE
  // ==========================================================

  const currentRevisionCode =
    currentRevision?.revision_code ||
    currentRevision?.revision ||
    document?.revision_code ||
    document?.revision ||
    "—";


  // ==========================================================
  // CURRENT REVISION STATUS
  // ==========================================================

  const currentRevisionStatus =
    currentRevision?.status ||
    document?.revision_status ||
    document?.status ||
    "—";


  // ==========================================================
  // CURRENT REVISION STAGE
  // ==========================================================

  const currentRevisionStage =
    currentRevision?.revision_stage ||
    currentRevision?.stage ||
    document?.revision_stage ||
    document?.stage ||
    "—";


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <section className="panel document-details-panel">

      {/* ====================================================
          HEADER
          ==================================================== */}

      <div className="document-details-header">

        <div>

          <p className="eyebrow">
            DOCUMENT #{document.id}
          </p>

          <h3>
            {document.document_number ||
              "Document"}
          </h3>

          <p>
            {document.title ||
              "Untitled document"}
          </p>

        </div>

        <div className="document-details-header-actions">

          <button
            className="secondary-action-button"
            onClick={generateCoverPage}
            disabled={coverPageLoading}
          >
            {coverPageLoading
              ? "Generating PDF..."
              : "Generate Cover Page PDF"}
          </button>

          <button
            className="close-button"
            onClick={onClose}
          >
            Close
          </button>

        </div>

      </div>


      {/* ====================================================
          DOCUMENT METADATA
          ==================================================== */}

      <div className="document-details-grid">

        <DetailItem
          label="Document Number"
          value={
            document.document_number ||
            "—"
          }
        />

        <DetailItem
          label="Customer Document"
          value={
            document.customer_document_number ||
            "—"
          }
        />

        <DetailItem
          label="Project"
          value={
            document.project_id ??
            "—"
          }
        />

        <DetailItem
          label="Current Revision"
          value={
            loadingCurrentRevision
              ? "Loading..."
              : currentRevisionCode
          }
        />

        <DetailItem
          label="Stage"
          value={
            loadingCurrentRevision
              ? "Loading..."
              : currentRevisionStage
          }
        />

        <DetailItem
          label="Status"
          value={
            loadingCurrentRevision
              ? "Loading..."
              : currentRevisionStatus
          }
        />

      </div>


      {/* ====================================================
          CURRENT REVISION CARD
          ==================================================== */}

      <div className="current-revision-section">

        <div className="section-heading">

          <div>

            <h4>
              Current Revision
            </h4>

            <p>
              Current controlled
              revision of this
              document.
            </p>

          </div>

        </div>


        {loadingCurrentRevision ? (

          <div className="revision-loading">

            <div className="loading-spinner"></div>

            Loading current
            revision...

          </div>

        ) : (

          <div className="current-revision-card">

            <div className="current-revision-code">

              <span>
                REV
              </span>

              <strong>
                {
                  currentRevisionCode
                }
              </strong>

            </div>


            <div className="current-revision-info">

              <div>

                <label>
                  Stage
                </label>

                <strong>
                  {formatStatus(
                    currentRevisionStage
                  )}
                </strong>

              </div>


              <div>

                <label>
                  Status
                </label>

                <DocumentStatus
                  status={
                    currentRevisionStatus
                  }
                />

              </div>


              <div>

                <label>
                  Revision Date
                </label>

                <strong>
                  {formatDate(
                    currentRevision?.revision_date
                  )}
                </strong>

              </div>


              <div>

                <label>
                  Issue Purpose
                </label>

                <strong>
                  {currentRevision?.issue_purpose ||
                    "—"}
                </strong>

              </div>

            </div>

          </div>

        )}

      </div>


      {/* ====================================================
          REVISION HISTORY
          ==================================================== */}

      <div className="revision-history-section">

        <div className="section-heading">

          <div>

            <h4>
              Revision History
            </h4>

            <p>
              Complete revision trail
              for this document.
            </p>

          </div>

          <span className="document-count">

            {revisions.length}{" "}
            revisions

          </span>

        </div>


        {loadingRevisions ? (

          <div className="revision-loading">

            <div className="loading-spinner"></div>

            Loading revision
            history...

          </div>

        ) : revisions.length ===
          0 ? (

          <div className="revision-empty">

            <strong>
              No revision history
              found.
            </strong>

            <span>
              This document does not
              currently have revision
              records returned by the
              backend.
            </span>

          </div>

        ) : (

          <div className="revision-list">

            {revisions.map(
              (revision) => (

                <RevisionRow
                  key={
                    revision.id
                  }
                  revision={
                    revision
                  }
                />

              )
            )}

          </div>

        )}

      </div>

    </section>

  );
}


// ============================================================
// REVISION ROW
// ============================================================

function RevisionRow({
  revision,
}) {

  const status =
    revision.status ||
    "UNKNOWN";

  const stage =
    revision.revision_stage ||
    revision.stage ||
    "—";

  const isCurrent =
    Boolean(
      revision.is_current
    );


  return (

    <div
      className={`revision-row ${
        isCurrent
          ? "current-revision"
          : ""
      }`}
    >

      {/* REVISION CODE */}

      <div className="revision-code-large">

        {revision.revision_code ||
          revision.revision ||
          "—"}

      </div>


      {/* REVISION INFORMATION */}

      <div className="revision-main">

        <strong>

          {formatStatus(
            stage
          )}

        </strong>

        <span>

          {revision.issue_purpose ||
            revision.reason_for_issue ||
            "No issue purpose specified"}

        </span>

      </div>


      {/* STATUS */}

      <div className="revision-status-column">

        <DocumentStatus
          status={
            status
          }
        />

        {isCurrent && (

          <span className="current-label">
            CURRENT
          </span>

        )}

      </div>


      {/* DATE */}

      <div className="revision-date">

        {formatDate(
          revision.revision_date ||
            revision.created_at
        )}

      </div>

    </div>

  );
}


// ============================================================
// DOCUMENT STATUS
// ============================================================

function getDocumentStatus(document) {
  return String(
    document?.current_revision_status ??
      document?.revision_status ??
      document?.current_status ??
      document?.status ??
      "UNKNOWN"
  )
    .trim()
    .toUpperCase();
}


// ============================================================
// DOCUMENT METRIC
// ============================================================

function DocumentMetric({
  label,
  value,
  icon,
}) {

  return (

    <div className="document-metric">

      <div className="document-metric-icon">

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
// DETAIL ITEM
// ============================================================

function DetailItem({
  label,
  value,
}) {

  return (

    <div className="detail-item">

      <label>
        {label}
      </label>

      <strong>
        {value}
      </strong>

    </div>

  );
}


// ============================================================
// DOCUMENT STATUS
// ============================================================

function DocumentStatus({
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
    normalized ===
      "APPROVED" ||
    normalized ===
      "COMPLETED"
  ) {

    className =
      "status-badge success";

  }


  if (
    normalized ===
      "REVIEW" ||
    normalized ===
      "UNDER_REVIEW" ||
    normalized ===
      "UNDER REVIEW" ||
    normalized ===
      "IN_PROGRESS" ||
    normalized ===
      "IN PROGRESS" ||
    normalized ===
      "SUBMITTED" ||
    normalized ===
      "PENDING" ||
    normalized ===
      "COMMENTED"
  ) {

    className =
      "status-badge warning";

  }


  if (
    normalized ===
      "REJECTED" ||
    normalized ===
      "FAILED"
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

      {formatStatus(
        normalized
      )}

    </span>

  );

}


// ============================================================
// STAGE BADGE
// ============================================================

function StageBadge({
  stage,
}) {

  const normalized =
    String(
      stage ||
        "UNKNOWN"
    ).toUpperCase();

  let className =
    "stage-badge";


  if (
    normalized ===
    "APPROVED"
  ) {

    className +=
      " stage-approved";

  }


  if (
    normalized ===
    "REVIEW"
  ) {

    className +=
      " stage-review";

  }


  return (

    <span
      className={
        className
      }
    >

      {formatStatus(
        normalized
      )}

    </span>

  );

}


// ============================================================
// FORMAT STATUS
// ============================================================

function formatStatus(
  value
) {

  return String(
    value || ""
  )
    .replaceAll(
      "_",
      " "
    )
    .replaceAll(
      "-",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
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