import {
  useEffect,
  useRef,
  useState,
} from "react";

import axios from "axios";

const API_BASE_URL =
  "http://localhost:5000/api";


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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


export default function ProjectTransmittals({
  project,
}) {

  const [
    transmittals,
    setTransmittals,
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
    selectedTransmittal,
    setSelectedTransmittal,
  ] = useState(null);

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [
    showUploadModal,
    setShowUploadModal,
  ] = useState(false);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    uploadStep,
    setUploadStep,
  ] = useState("");

  const fileInputRef =
    useRef(null);


  // ==========================================================
  // LOAD PROJECT TRANSMITTALS
  // ==========================================================

  async function loadTransmittals() {

    if (!project?.id) {
      setTransmittals([]);
      return;
    }

    try {

      setLoading(true);
      setError("");

      const response =
        await axios.get(
          `${API_BASE_URL}/customer-transmittals`,
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
          : payload?.transmittals ||
            payload?.data ||
            [];

      setTransmittals(rows);

    } catch (err) {

      console.error(
        "PROJECT TRANSMITTAL LOAD ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load project transmittals."
      );

    } finally {

      setLoading(false);

    }
  }


  // ==========================================================
  // INITIAL LOAD / PROJECT CHANGE
  // ==========================================================

  useEffect(() => {

    loadTransmittals();

  }, [project?.id]);


  // ==========================================================
  // OPEN TRANSMITTAL
  // ==========================================================

  async function openTransmittal(
    transmittalId
  ) {

    try {

      setDetailsLoading(true);
      setError("");

      const response =
        await axios.get(
          `${API_BASE_URL}/customer-transmittals/${transmittalId}`
        );

      setSelectedTransmittal(
        response.data
      );

    } catch (err) {

      console.error(
        "TRANSMITTAL DETAILS ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load transmittal details."
      );

    } finally {

      setDetailsLoading(false);

    }
  }


  // ==========================================================
  // OPEN UPLOAD MODAL
  // ==========================================================

  function openUploadModal() {

    setError("");
    setSelectedFile(null);
    setUploadStep("");
    setShowUploadModal(true);

  }


  // ==========================================================
  // CLOSE UPLOAD MODAL
  // ==========================================================

  function closeUploadModal() {

    if (uploading) {
      return;
    }

    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadStep("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

  }


  // ==========================================================
  // FILE CHANGE
  // ==========================================================

  function handleFileChange(
    event
  ) {

    const file =
      event.target.files?.[0];

    if (!file) {

      setSelectedFile(null);

      return;
    }


    // --------------------------------------------------------
    // PDF ONLY
    // --------------------------------------------------------

    if (
      file.type !==
      "application/pdf"
    ) {

      setError(
        "Only PDF files are allowed."
      );

      event.target.value = "";

      setSelectedFile(null);

      return;
    }


    // --------------------------------------------------------
    // 20 MB LIMIT
    // --------------------------------------------------------

    if (
      file.size >
      20 * 1024 * 1024
    ) {

      setError(
        "The PDF must be smaller than 20 MB."
      );

      event.target.value = "";

      setSelectedFile(null);

      return;
    }


    setError("");
    setSelectedFile(file);

  }


  // ==========================================================
  // UPLOAD + ANALYSE
  // ==========================================================

  async function uploadAndAnalyse() {

    if (!selectedFile) {

      setError(
        "Please select a PDF transmittal."
      );

      return;
    }


    if (!project?.id) {

      setError(
        "Project ID is missing."
      );

      return;
    }


    try {

      setUploading(true);
      setError("");


      // ------------------------------------------------------
      // STEP 1 — UPLOAD
      // ------------------------------------------------------

      setUploadStep(
        "Uploading customer transmittal..."
      );


      const formData =
        new FormData();


      formData.append(
        "transmittal",
        selectedFile
      );


      /*
       * IMPORTANT
       *
       * We DO NOT ask the user to enter
       * the project ID.
       *
       * It comes automatically from:
       *
       * project.id
       */

      formData.append(
        "project_id",
        String(project.id)
      );


      const uploadResponse =
        await axios.post(
          `${API_BASE_URL}/customer-transmittals/upload`,
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );


      const transmittalId =
        uploadResponse.data
          ?.transmittal
          ?.id;


      if (!transmittalId) {

        throw new Error(
          "Upload succeeded, but no transmittal ID was returned."
        );

      }


      // ------------------------------------------------------
      // STEP 2 — ANALYSE
      // ------------------------------------------------------

      setUploadStep(
        "Analysing PDF and extracting documents..."
      );


      await axios.get(
        `${API_BASE_URL}/customer-transmittals/${transmittalId}/analyse`
      );


      // ------------------------------------------------------
      // STEP 3 — RELOAD PROJECT TRANSMITTALS
      // ------------------------------------------------------

      setUploadStep(
        "Updating project transmittals..."
      );


      await loadTransmittals();


      // ------------------------------------------------------
      // STEP 4 — CLOSE MODAL
      // ------------------------------------------------------

      setShowUploadModal(false);

      setSelectedFile(null);

      setUploadStep("");


      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }


      // ------------------------------------------------------
      // STEP 5 — OPEN NEW TRANSMITTAL
      // ------------------------------------------------------

      await openTransmittal(
        transmittalId
      );


    } catch (err) {

      console.error(
        "UPLOAD TRANSMITTAL ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to upload and analyse the transmittal."
      );

    } finally {

      setUploading(false);

    }

  }


  // ==========================================================
  // TRANSMITTAL DETAILS
  // ==========================================================

  if (selectedTransmittal) {

    const transmittal =
      selectedTransmittal.transmittal ||
      selectedTransmittal;

    const items =
      selectedTransmittal.documents ||
      selectedTransmittal.items ||
      [];


    return (
      <section className="project-details-panel">

        <div className="section-heading">

          <div>

            <button
              className="secondary-action-button"
              onClick={() =>
                setSelectedTransmittal(null)
              }
            >
              ← Back to Transmittals
            </button>

            <p className="eyebrow">
              PROJECT TRANSMITTAL
            </p>

            <h4>
              {
                transmittal.transmittal_reference ||
                `Transmittal #${transmittal.id}`
              }
            </h4>

            <p>
              {project.project_name}
              {" • "}
              {project.project_code}
            </p>

          </div>

        </div>


        <div className="project-details-grid">

          <div className="project-detail-item">

            <label>
              PROJECT
            </label>

            <strong>
              {project.project_code}
            </strong>

          </div>


          <div className="project-detail-item">

            <label>
              CUSTOMER
            </label>

            <strong>
              {
                transmittal.customer_name ||
                "—"
              }
            </strong>

          </div>


          <div className="project-detail-item">

            <label>
              TRANSMITTAL DATE
            </label>

            <strong>
              {formatDate(
                transmittal.transmittal_date
              )}
            </strong>

          </div>


          <div className="project-detail-item">

            <label>
              STATUS
            </label>

            <strong>
              {
                transmittal.analysis_status ||
                "—"
              }
            </strong>

          </div>


          <div className="project-detail-item">

            <label>
              DOCUMENTS
            </label>

            <strong>
              {items.length}
            </strong>

          </div>


          <div className="project-detail-item">

            <label>
              TRANSMITTAL ID
            </label>

            <strong>
              #{transmittal.id}
            </strong>

          </div>

        </div>


        <div className="project-description-section">

          <div className="section-heading">

            <div>

              <h4>
                Transmittal Documents
              </h4>

              <p>
                Documents extracted from this
                customer transmittal.
              </p>

            </div>

            <span className="document-count">
              {items.length} documents
            </span>

          </div>


          {items.length === 0 ? (

            <div className="projects-empty">

              <div className="empty-icon">
                ▤
              </div>

              <strong>
                No documents found
              </strong>

              <span>
                No document items were extracted
                from this transmittal.
              </span>

            </div>

          ) : (

            <div className="table-container">

              <table className="projects-table">

                <thead>

                  <tr>

                    <th>
                      DOCUMENT NUMBER
                    </th>

                    <th>
                      REVISION
                    </th>

                    <th>
                      PURPOSE
                    </th>

                    <th>
                      DESCRIPTION
                    </th>

                    <th>
                      MATCH
                    </th>

                    <th>
                      PROCESSED
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {items.map(
                    (item) => (

                      <tr
                        key={item.id}
                      >

                        <td>

                          <span className="project-code-badge">
                            {
                              item.customer_document_number ||
                              "—"
                            }
                          </span>

                        </td>


                        <td>

                          {
                            item.customer_revision ||
                            "—"
                          }

                        </td>


                        <td>

                          {
                            item.purpose_code ||
                            "—"
                          }

                        </td>


                        <td>

                          <span className="project-description-cell">
                            {
                              item.description ||
                              "—"
                            }
                          </span>

                        </td>


                        <td>

                          <span
                            className={
                              item.document_match_status ===
                              "MATCHED"
                                ? "status-badge success"
                                : "status-badge warning"
                            }
                          >
                            {
                              item.document_match_status ||
                              "PENDING"
                            }
                          </span>

                        </td>


                        <td>

                          <span
                            className={
                              item.response_processed
                                ? "status-badge success"
                                : "status-badge neutral"
                            }
                          >
                            {
                              item.response_processed
                                ? "PROCESSED"
                                : "PENDING"
                            }
                          </span>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </section>
    );

  }


  // ==========================================================
  // MAIN PROJECT TRANSMITTALS PAGE
  // ==========================================================

  return (

    <section className="project-details-panel">

      <div className="section-heading">

        <div>

          <p className="eyebrow">
            CUSTOMER COMMUNICATION
          </p>

          <h4>
            Project Transmittals
          </h4>

          <p>
            Customer transmittals associated
            only with this project.
          </p>

        </div>


        <div className="documents-header-actions">

          <span className="document-count">

            {transmittals.length}
            {" "}
            transmittals

          </span>


          <button
            className="refresh-button"
            onClick={
              loadTransmittals
            }
            disabled={loading}
          >
            ↻ Refresh
          </button>


          <button
            className="upload-button"
            onClick={
              openUploadModal
            }
          >
            <span>
              ＋
            </span>

            Upload Transmittal
          </button>

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


      {loading ? (

        <div className="projects-empty">

          <div className="loading-spinner"></div>

          <strong>
            Loading project transmittals...
          </strong>

          <span>
            Reading transmittals for{" "}
            {project.project_name}.
          </span>

        </div>

      ) : transmittals.length === 0 ? (

        <div className="projects-empty">

          <div className="empty-icon">
            ⇄
          </div>

          <strong>
            No transmittals found
          </strong>

          <span>
            There are currently no customer
            transmittals associated with{" "}
            {project.project_name}.
          </span>

          <button
            className="empty-upload-button"
            onClick={
              openUploadModal
            }
          >
            ＋ Upload First Transmittal
          </button>

        </div>

      ) : (

        <div className="table-container">

          <table className="projects-table">

            <thead>

              <tr>

                <th>
                  ID
                </th>

                <th>
                  CUSTOMER
                </th>

                <th>
                  REFERENCE
                </th>

                <th>
                  TRANSMITTAL DATE
                </th>

                <th>
                  DOCUMENTS
                </th>

                <th>
                  MATCHED
                </th>

                <th>
                  PROCESSED
                </th>

                <th>
                  STATUS
                </th>

                <th>
                </th>

              </tr>

            </thead>


            <tbody>

              {transmittals.map(
                (item) => (

                  <tr
                    key={item.id}
                  >

                    <td>

                      <span className="project-code-badge">
                        #{item.id}
                      </span>

                    </td>


                    <td>

                      <div className="project-name-cell">

                        <strong>
                          {
                            item.customer_name ||
                            "Unknown Customer"
                          }
                        </strong>

                        <span>
                          {
                            item.file_name ||
                            "No file name"
                          }
                        </span>

                      </div>

                    </td>


                    <td>

                      {
                        item.transmittal_reference ||
                        "—"
                      }

                    </td>


                    <td>

                      {
                        formatDate(
                          item.transmittal_date
                        )
                      }

                    </td>


                    <td>

                      {
                        item.item_count ??
                        0
                      }

                    </td>


                    <td>

                      <span className="status-badge success">
                        {
                          item.matched_count ??
                          0
                        }
                      </span>

                    </td>


                    <td>

                      <span className="status-badge neutral">
                        {
                          item.processed_count ??
                          0
                        }
                      </span>

                    </td>


                    <td>

                      <span
                        className={
                          String(
                            item.analysis_status ||
                              ""
                          ).toUpperCase() ===
                          "ANALYSED"
                            ? "status-badge success"
                            : "status-badge warning"
                        }
                      >
                        {
                          item.analysis_status ||
                          "PENDING"
                        }
                      </span>

                    </td>


                    <td>

                      <button
                        className="view-button"
                        onClick={() =>
                          openTransmittal(
                            item.id
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


      {/* ======================================================
          UPLOAD MODAL
          ====================================================== */}

      {showUploadModal && (

        <div
          className="modal-backdrop"
          onMouseDown={(event) => {

            if (
              event.target ===
                event.currentTarget &&
              !uploading
            ) {

              closeUploadModal();

            }

          }}
        >

          <div className="project-modal">

            <div className="modal-header">

              <div>

                <p className="eyebrow">
                  CUSTOMER TRANSMITTAL
                </p>

                <h3>
                  Upload Transmittal
                </h3>

                <p>
                  Upload a customer transmittal
                  for this project.
                </p>

              </div>


              <button
                className="modal-close"
                onClick={
                  closeUploadModal
                }
                disabled={uploading}
              >
                ×
              </button>

            </div>


            <div className="modal-body">

              <div className="project-form-info">

                <span>
                  ✓
                </span>

                <div>

                  <strong>
                    Project
                  </strong>

                  <small>
                    {
                      project.project_code
                    }
                    {" — "}
                    {
                      project.project_name
                    }
                  </small>

                </div>

              </div>


              <div className="form-group">

                <label>
                  Customer Transmittal PDF
                  <span>
                    *
                  </span>
                </label>


                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  accept="application/pdf"
                  onChange={
                    handleFileChange
                  }
                  disabled={
                    uploading
                  }
                />


                <small>
                  PDF only. Maximum size:
                  20 MB.
                </small>

              </div>


              {selectedFile && (

                <div className="project-form-info">

                  <span>
                    ✓
                  </span>

                  <div>

                    <strong>
                      Selected File
                    </strong>

                    <small>
                      {
                        selectedFile.name
                      }
                    </small>

                  </div>

                </div>

              )}


              {uploadStep && (

                <div className="project-form-info">

                  <span>
                    ↻
                  </span>

                  <div>

                    <strong>
                      Processing
                    </strong>

                    <small>
                      {uploadStep}
                    </small>

                  </div>

                </div>

              )}

            </div>


            <div className="modal-footer">

              <button
                className="cancel-button"
                onClick={
                  closeUploadModal
                }
                disabled={
                  uploading
                }
              >
                Cancel
              </button>


              <button
                className="confirm-upload-button"
                onClick={
                  uploadAndAnalyse
                }
                disabled={
                  uploading ||
                  !selectedFile
                }
              >

                {uploading ? (
                  <>
                    <span className="button-spinner"></span>

                    Processing...
                  </>
                ) : (
                  <>
                    <span>
                      ↑
                    </span>

                    Upload & Analyse
                  </>
                )}

              </button>

            </div>

          </div>

        </div>

      )}

    </section>

  );
}