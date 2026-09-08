import {
  useEffect,
  useRef,
  useState,
} from "react";

import api from "./services/api";
import { useAuth } from "./context/AuthContext";

import "./App.css";
import "./dashboard.css";
import "./professional-ui.css";

import Documents from "./components/Documents";
import Projects from "./components/Projects";
import Users from "./components/Users";
import Layout from "./components/Layout";
import Login from "./pages/Login";

// ============================================================
// APP
// ============================================================

function App() {

  const {
    user,
    loading: authLoading,
    logout,
    updateUser,
  } = useAuth();

  // ==========================================================
  // PAGE
  // ==========================================================

  const [
    activePage,
    setActivePage,
  ] = useState("dashboard");

  // ==========================================================
  // TRANSMITTALS
  // ==========================================================

  const [
    transmittals,
    setTransmittals,
  ] = useState([]);

  const [
    selectedTransmittal,
    setSelectedTransmittal,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  const [dashboardProjects, setDashboardProjects] = useState([]);
  const [dashboardUsers, setDashboardUsers] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardUsersAvailable, setDashboardUsersAvailable] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  // ==========================================================
  // PROFILE MENU
  // ==========================================================

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileMode, setProfileMode] = useState("view");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [profileNotice, setProfileNotice] = useState("");


  // ==========================================================
  // UPLOAD
  // ==========================================================

  const [
    showUploadModal,
    setShowUploadModal,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    uploadStep,
    setUploadStep,
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [
    projectId,
    setProjectId,
  ] = useState("1");

  const fileInputRef =
    useRef(null);

  // ==========================================================
  // LOAD TRANSMITTALS
  // ==========================================================

  async function loadTransmittals() {

    try {

      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/customer-transmittals"
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
        "LOAD TRANSMITTALS ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load customer transmittals."
      );

    } finally {

      setLoading(false);

    }
  }


  // ==========================================================
  // LOAD DASHBOARD DATA
  // ==========================================================

  async function loadDashboardData() {
    try {
      setDashboardLoading(true);

      const [projectsResult, usersResult] = await Promise.allSettled([
        api.get("/projects"),
        api.get("/users"),
      ]);

      if (projectsResult.status === "fulfilled") {
        const payload = projectsResult.value.data;
        const rows = Array.isArray(payload)
          ? payload
          : payload?.projects || payload?.data || [];
        setDashboardProjects(rows);
      } else {
        console.error("LOAD DASHBOARD PROJECTS ERROR:", projectsResult.reason);
      }

      if (usersResult.status === "fulfilled") {
        const payload = usersResult.value.data;
        const rows = Array.isArray(payload)
          ? payload
          : payload?.users || payload?.data || [];
        setDashboardUsers(rows);
        setDashboardUsersAvailable(true);
      } else {
        setDashboardUsers([]);
        setDashboardUsersAvailable(false);
        console.error("LOAD DASHBOARD USERS ERROR:", usersResult.reason);
      }
    } finally {
      setDashboardLoading(false);
    }
  }


  // ==========================================================
  // OPEN TRANSMITTAL
  // ==========================================================

  async function openTransmittal(id) {

    try {

      setDetailsLoading(true);
      setError("");

      const response =
        await api.get(
          `/customer-transmittals/${id}`
        );

      setSelectedTransmittal(
        response.data
      );

    } catch (err) {

      console.error(
        "LOAD TRANSMITTAL DETAILS ERROR:",
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
  // UPLOAD MODAL
  // ==========================================================

  function openUploadModal() {

    setError("");

    setSelectedFile(null);

    setUploadStep("");

    setShowUploadModal(true);

  }


  function closeUploadModal() {

    if (uploading) {
      return;
    }

    setShowUploadModal(false);

    setSelectedFile(null);

    setUploadStep("");

    if (fileInputRef.current) {

      fileInputRef.current.value =
        "";

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

      event.target.value =
        "";

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

      event.target.value =
        "";

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


    if (!projectId.trim()) {

      setError(
        "Project ID is required."
      );

      return;

    }


    try {

      setUploading(true);

      setError("");


      // ------------------------------------------------------
      // STEP 1
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

      formData.append(
        "project_id",
        projectId.trim()
      );


      const uploadResponse =
        await api.post(
          "/customer-transmittals/upload",
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
      // STEP 2
      // ------------------------------------------------------

      setUploadStep(
        "Analysing PDF and extracting documents..."
      );


      await api.get(
        `/customer-transmittals/${transmittalId}/analyse`
      );


      // ------------------------------------------------------
      // STEP 3
      // ------------------------------------------------------

      setUploadStep(
        "Updating dashboard..."
      );


      await loadTransmittals();


      // ------------------------------------------------------
      // STEP 4
      // ------------------------------------------------------

      setShowUploadModal(false);

      setSelectedFile(null);

      setUploadStep("");


      if (fileInputRef.current) {

        fileInputRef.current.value =
          "";

      }


      // ------------------------------------------------------
      // STEP 5
      // ------------------------------------------------------

      setActivePage(
        "transmittals"
      );


      await openTransmittal(
        transmittalId
      );

    } catch (err) {

      console.error(
        "UPLOAD ERROR:",
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
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    if (!user) {
      return;
    }

    loadTransmittals();
    loadDashboardData();

  }, [user]);


  function openProfile(mode = "view") {
    setProfileMenuOpen(false);
    setProfileMode(mode);
    setProfileNotice("");
    setError("");
    setProfileForm({
      name: user?.name || user?.full_name || "",
      email: user?.email || "",
    });
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setProfileModalOpen(true);
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      setProfileSaving(true);
      setError("");
      const response = await api.patch("/users/me", {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      });
      const updatedUser = response.data?.user;
      if (!updatedUser) throw new Error("Updated profile was not returned by the server.");
      updateUser(updatedUser);
      setProfileNotice("Profile updated successfully.");
      setProfileMode("view");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    try {
      setProfileSaving(true);
      setError("");
      await api.post("/users/me/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setProfileNotice("Password changed successfully.");
      setProfileMode("view");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to change password.");
    } finally {
      setProfileSaving(false);
    }
  }

  // ==========================================================
  // PAGE TITLE
  // ==========================================================

  function getPageTitle() {

    switch (
      activePage
    ) {

      case "documents":
        return "Documents";

      case "projects":
        return "Projects";

      case "transmittals":
        return "Customer Transmittals";

      case "approvals":
        return "Approvals";

      case "settings":
        return "Settings";

      case "users":
        return "User Management";

      default:
        return "Dashboard";

    }
  }


  // ==========================================================
  // NAVIGATION
  // ==========================================================

  function navigateTo(
    page
  ) {

    setError("");

    setActivePage(page);

  }


  // ==========================================================
  // AUTHENTICATION GATE
  // ==========================================================

  if (authLoading) {

    return (
      <div className="auth-loading-screen">
        <div className="loading-spinner"></div>
        <span>Loading Document Control...</span>
      </div>
    );
  }

  if (!user) {

    return (
      <Login />
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <Layout
      activePage={activePage}
      onNavigate={navigateTo}
      role={user?.role}
    >

      {/* ==================================================
          TOPBAR
          ================================================== */}

      <header className="topbar">

        {/* PAGE TITLE */}
        <div className="topbar-title">

          <p className="eyebrow">
            DOCUMENT CONTROL
          </p>

          <h2>
            {getPageTitle()}
          </h2>

        </div>


        {/* TOPBAR ACTIONS */}
        <div className="topbar-actions">

          {/* REFRESH */}
          {(
            activePage === "dashboard" ||
            activePage === "transmittals"
          ) && (

            <button
              type="button"
              className="refresh-button"
              onClick={
                activePage === "dashboard"
                  ? loadDashboardData
                  : loadTransmittals
              }
              disabled={
                activePage === "dashboard"
                  ? dashboardLoading
                  : loading
              }
              title={
                activePage === "dashboard"
                  ? "Refresh dashboard"
                  : "Refresh transmittals"
              }
            >

              {activePage === "dashboard"
                ? dashboardLoading
                  ? "↻ Loading..."
                  : "↻ Refresh"
                : loading
                  ? "↻ Loading..."
                  : "↻ Refresh"}

            </button>

          )}


          {/* PROFILE */}
          <div className="profile-menu-wrapper">
            <button
              type="button"
              className="topbar-user profile-trigger"
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
            >
              <div className="topbar-user-avatar">
                {(user?.name || user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="topbar-user-info">
                <strong>{user?.name || user?.full_name || user?.email || "User"}</strong>
                <span>{user?.role || "Document Controller"}</span>
              </div>
              <span className="profile-chevron">⌄</span>
            </button>

            {profileMenuOpen && (
              <div className="profile-menu" role="menu">
                <div className="profile-menu-header">
                  <div className="profile-menu-avatar">{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{user?.name || user?.email || "User"}</strong>
                    <span>{user?.email || ""}</span>
                  </div>
                </div>
                <div className="profile-menu-divider" />
                <button type="button" className="profile-menu-item" onClick={() => openProfile("view")} role="menuitem">
                  <span className="profile-menu-icon">◎</span>
                  <div><strong>My Profile</strong><small>View account details</small></div>
                </button>
                <button type="button" className="profile-menu-item" onClick={() => openProfile("edit")} role="menuitem">
                  <span className="profile-menu-icon">✎</span>
                  <div><strong>Edit Profile</strong><small>Update your name and email</small></div>
                </button>
                <button type="button" className="profile-menu-item" onClick={() => openProfile("password")} role="menuitem">
                  <span className="profile-menu-icon">▣</span>
                  <div><strong>Change Password</strong><small>Update your sign-in password</small></div>
                </button>
                <div className="profile-menu-divider" />
                <button type="button" className="profile-menu-item profile-menu-signout" onClick={logout} role="menuitem">
                  <span className="profile-menu-icon">↪</span>
                  <div><strong>Sign out</strong><small>End this session</small></div>
                </button>
              </div>
            )}
          </div>

        </div>

      </header>


      {/* ==================================================
          PROFILE MODAL
          ================================================== */}
      {profileModalOpen && (
        <div className="profile-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !profileSaving) setProfileModalOpen(false);
        }}>
          <section className="profile-modal" role="dialog" aria-modal="true">
            <div className="profile-modal-header">
              <div>
                <p className="eyebrow">ACCOUNT</p>
                <h3>{profileMode === "password" ? "Change Password" : profileMode === "edit" ? "Edit Profile" : "My Profile"}</h3>
                <p>{profileMode === "password" ? "Keep your Document Control account secure." : "Manage the account details used to access the workspace."}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setProfileModalOpen(false)} disabled={profileSaving}>×</button>
            </div>

            {profileNotice && <div className="profile-notice">{profileNotice}</div>}

            {profileMode === "view" && (
              <div className="profile-modal-body">
                <div className="profile-identity-block">
                  <div className="profile-large-avatar">{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</div>
                  <div><h4>{user?.name || user?.email || "User"}</h4><span>{formatRole(user?.role)}</span></div>
                </div>
                <div className="profile-details-grid">
                  <ProfileDetail label="Full name" value={user?.name || user?.full_name || "—"} />
                  <ProfileDetail label="Email" value={user?.email || "—"} />
                  <ProfileDetail label="Role" value={formatRole(user?.role)} />
                  <ProfileDetail label="User ID" value={user?.id ?? "—"} />
                </div>
              </div>
            )}

            {profileMode === "edit" && (
              <form className="profile-form" onSubmit={saveProfile}>
                <label>Full name<input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required /></label>
                <label>Email address<input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required /></label>
                <div className="profile-readonly-row"><span>Role</span><strong>{formatRole(user?.role)}</strong><small>Role changes are controlled by an administrator.</small></div>
                <div className="profile-modal-footer"><button type="button" className="secondary-action" onClick={() => setProfileMode("view")}>Cancel</button><button type="submit" className="primary-action" disabled={profileSaving}>{profileSaving ? "Saving..." : "Save Changes"}</button></div>
              </form>
            )}

            {profileMode === "password" && (
              <form className="profile-form" onSubmit={changePassword}>
                <label>Current password<input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required /></label>
                <label>New password<input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} minLength="8" required /></label>
                <label>Confirm new password<input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} minLength="8" required /></label>
                <p className="profile-security-note">Use at least 8 characters. Your current password is required before the change is accepted.</p>
                <div className="profile-modal-footer"><button type="button" className="secondary-action" onClick={() => setProfileMode("view")}>Cancel</button><button type="submit" className="primary-action" disabled={profileSaving}>{profileSaving ? "Updating..." : "Change Password"}</button></div>
              </form>
            )}
          </section>
        </div>
      )}


      {/* ==================================================
          GLOBAL ERROR
          ================================================== */}

      {error && (

        <div className="content">

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

        </div>

      )}


      {/* ==================================================
          DASHBOARD
          ================================================== */}

      {activePage ===
        "dashboard" && (

        <section className="content dashboard-content">

          <div className="dashboard-welcome">
            <div>
              <p className="eyebrow">DOCUMENT CONTROL</p>
              <h3>Workspace Overview</h3>
              <p>
                A clear view of your projects, team and document-control workspace.
              </p>
            </div>

            <div className="dashboard-live-indicator">
              <span className="dashboard-live-dot"></span>
              Live workspace
            </div>
          </div>

          <div className="dashboard-metrics">
            <div className="dashboard-metric-card dashboard-metric-projects">
              <div className="dashboard-metric-icon">▦</div>
              <div>
                <span>Projects</span>
                <strong>{dashboardLoading ? "—" : dashboardProjects.length}</strong>
                <small>Accessible workspace projects</small>
              </div>
            </div>

            <div className="dashboard-metric-card dashboard-metric-users">
              <div className="dashboard-metric-icon">♙</div>
              <div>
                <span>Users</span>
                <strong>
                  {dashboardUsersAvailable
                    ? dashboardLoading
                      ? "—"
                      : dashboardUsers.length
                    : "—"}
                </strong>
                <small>Registered system users</small>
              </div>
            </div>
          </div>

          <div className="dashboard-overview-grid">
            <section className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <p className="dashboard-card-kicker">PORTFOLIO</p>
                  <h4>Projects</h4>
                  <span>Your accessible project workspace</span>
                </div>
                <button
                  type="button"
                  className="dashboard-link-button"
                  onClick={() => navigateTo("projects")}
                >
                  View projects →
                </button>
              </div>

              <div className="dashboard-project-list">
                {dashboardLoading ? (
                  <div className="dashboard-list-placeholder">Loading projects...</div>
                ) : dashboardProjects.length === 0 ? (
                  <div className="dashboard-list-placeholder">No projects available.</div>
                ) : (
                  dashboardProjects.map((project) => {
                    const active = project.is_active !== false;
                    return (
                      <div className="dashboard-project-row" key={project.id}>
                        <div className="dashboard-project-mark">
                          {String(project.project_code || "P").charAt(0).toUpperCase()}
                        </div>
                        <div className="dashboard-project-main">
                          <strong>{project.project_name || project.name || "Unnamed project"}</strong>
                          <span>{project.project_code || `Project ${project.id}`}</span>
                        </div>
                        <span className={active ? "dashboard-status active" : "dashboard-status"}>
                          {active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <p className="dashboard-card-kicker">ADMINISTRATION</p>
                  <h4>Administrators</h4>
                  <span>People with system administration access</span>
                </div>
                <div className="dashboard-count-pill">
                  {dashboardUsersAvailable
                    ? dashboardUsers.filter((item) => String(item.role || "").toLowerCase() === "admin").length
                    : "—"}
                </div>
              </div>

              <div className="dashboard-admin-list">
                {!dashboardUsersAvailable ? (
                  <div className="dashboard-list-placeholder">Administrator details are restricted for this account.</div>
                ) : dashboardLoading ? (
                  <div className="dashboard-list-placeholder">Loading administrators...</div>
                ) : dashboardUsers.filter((item) => String(item.role || "").toLowerCase() === "admin").length === 0 ? (
                  <div className="dashboard-list-placeholder">No administrators found.</div>
                ) : (
                  dashboardUsers
                    .filter((item) => String(item.role || "").toLowerCase() === "admin")
                    .map((admin) => (
                      <div className="dashboard-admin-row" key={admin.id}>
                        <div className="dashboard-admin-avatar">
                          {(admin.name || admin.full_name || admin.email || "A").charAt(0).toUpperCase()}
                        </div>
                        <div className="dashboard-admin-main">
                          <strong>{admin.name || admin.full_name || "Unnamed administrator"}</strong>
                          <span>{admin.email || "No email available"}</span>
                        </div>
                        <span className="dashboard-role-badge">Admin</span>
                      </div>
                    ))
                )}
              </div>
            </section>
          </div>

        </section>
      )}

      {/* ==================================================
          DOCUMENTS
          ================================================== */}

      {activePage ===
        "documents" && (

        <section className="content">

          <Documents />

        </section>

      )}


      {/* ==================================================
          PROJECTS
          ================================================== */}

      {activePage ===
        "projects" && (

        <section className="content">

          <Projects />

        </section>

      )}


      {/* ==================================================
          TRANSMITTALS
          ================================================== */}

      {activePage ===
        "transmittals" && (

        <section className="content">


          {/* SUMMARY */}

          <div className="summary-grid">

            <SummaryCard
              title="Total Transmittals"
              value={
                transmittals.length
              }
              icon="▤"
            />

            <SummaryCard
              title="Analysed"
              value={
                transmittals.filter(
                  (item) =>
                    String(
                      item.analysis_status ||
                        ""
                    ).toUpperCase() ===
                    "ANALYSED"
                ).length
              }
              icon="✓"
            />

            <SummaryCard
              title="Documents"
              value={
                transmittals.reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    Number(
                      item.item_count ||
                        0
                    ),
                  0
                )
              }
              icon="▦"
            />

            <SummaryCard
              title="Processed"
              value={
                transmittals.reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    Number(
                      item.processed_count ||
                        0
                    ),
                  0
                )
              }
              icon="↗"
            />

          </div>


          {/* TRANSMITTAL PANEL */}

          <section className="panel">

            <div className="panel-header">

              <div>

                <h3>
                  Customer Transmittals
                </h3>

                <p>
                  Uploaded customer
                  documents and
                  processing status.
                </p>

              </div>


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


            {loading ? (

              <div className="empty-state">

                <div className="loading-spinner"></div>

                Loading
                transmittals...

              </div>

            ) : transmittals.length ===
              0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  ⇄
                </div>

                <strong>
                  No customer
                  transmittals found
                </strong>

                <span>
                  Upload your first
                  customer transmittal
                  to begin processing.
                </span>

                <button
                  className="empty-upload-button"
                  onClick={
                    openUploadModal
                  }
                >
                  Upload
                  Transmittal
                </button>

              </div>

            ) : (

              <div className="table-container">

                <table>

                  <thead>

                    <tr>

                      <th>
                        ID
                      </th>

                      <th>
                        Customer
                      </th>

                      <th>
                        Reference
                      </th>

                      <th>
                        Transmittal Date
                      </th>

                      <th>
                        Documents
                      </th>

                      <th>
                        Matched
                      </th>

                      <th>
                        Processed
                      </th>

                      <th>
                        Status
                      </th>

                      <th></th>

                    </tr>

                  </thead>


                  <tbody>

                    {transmittals.map(
                      (
                        transmittal
                      ) => (

                        <tr
                          key={
                            transmittal.id
                          }
                        >

                          <td>

                            <span className="id-badge">

                              #
                              {
                                transmittal.id
                              }

                            </span>

                          </td>


                          <td>

                            <div className="customer-cell">

                              <strong>

                                {
                                  transmittal.customer_name ||
                                  "Unknown Customer"
                                }

                              </strong>

                              <span>

                                {
                                  transmittal.file_name ||
                                  "—"
                                }

                              </span>

                            </div>

                          </td>


                          <td>

                            {
                              transmittal.transmittal_reference ||
                              "—"
                            }

                          </td>


                          <td>

                            {
                              transmittal.transmittal_date ||
                              "—"
                            }

                          </td>


                          <td>

                            {
                              transmittal.item_count ??
                              0
                            }

                          </td>


                          <td>

                            <span className="count matched">

                              {
                                transmittal.matched_count ??
                                0
                              }

                            </span>

                          </td>


                          <td>

                            <span className="count processed">

                              {
                                transmittal.processed_count ??
                                0
                              }

                            </span>

                          </td>


                          <td>

                            <StatusBadge
                              status={
                                transmittal.analysis_status
                              }
                            />

                          </td>


                          <td>

                            <button
                              className="view-button"
                              onClick={() =>
                                openTransmittal(
                                  transmittal.id
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


          {/* DETAILS LOADING */}

          {detailsLoading && (

            <section className="panel details-panel">

              <div className="empty-state">

                <div className="loading-spinner"></div>

                Loading
                transmittal details...

              </div>

            </section>

          )}


          {/* DETAILS */}

          {selectedTransmittal &&
            !detailsLoading && (

            <TransmittalDetails
              data={
                selectedTransmittal
              }
              onClose={() =>
                setSelectedTransmittal(
                  null
                )
              }
            />

          )}

        </section>

      )}


      {/* ==================================================
          APPROVALS
          ================================================== */}

      {activePage ===
        "approvals" && (

        <section className="content">

          <section className="panel">

            <div className="panel-header">

              <div>

                <p className="eyebrow">
                  WORKFLOW
                </p>

                <h3>
                  Approvals
                </h3>

                <p>
                  Review and control
                  document approval
                  workflows.
                </p>

              </div>

            </div>


            <div className="empty-state">

              <div className="empty-icon">
                ✓
              </div>

              <strong>
                Approval Centre
              </strong>

              <span>
                This module is ready
                for connection to your
                existing approval
                workflow API.
              </span>

            </div>

          </section>

        </section>

      )}


      {/* ==================================================
          ADMIN — USERS
          ================================================== */}
      {activePage === "users" && String(user?.role || "").toLowerCase() === "admin" && (
        <section className="content"><Users /></section>
      )}


      {/* ==================================================
          SETTINGS
          ================================================== */}

      {activePage ===
        "settings" && (

        <section className="content">

          <section className="panel">

            <div className="panel-header">

              <div>

                <p className="eyebrow">
                  SYSTEM
                </p>

                <h3>
                  Settings
                </h3>

                <p>
                  Configure your document
                  control system.
                </p>

              </div>

            </div>


            <div className="settings-grid">


              {/* PROJECT MANAGEMENT */}

              <button
                className="settings-card"
                onClick={() =>
                  navigateTo(
                    "projects"
                  )
                }
              >

                <div className="settings-card-icon">
                  ⌂
                </div>

                <div>

                  <strong>
                    Project Management
                  </strong>

                  <span>
                    Create and manage
                    projects.
                  </span>

                </div>

                <span className="settings-card-arrow">
                  →
                </span>

              </button>


              {/* DOCUMENT MANAGEMENT */}

              <button
                className="settings-card"
                onClick={() =>
                  navigateTo(
                    "documents"
                  )
                }
              >

                <div className="settings-card-icon">
                  ▤
                </div>

                <div>

                  <strong>
                    Document Management
                  </strong>

                  <span>
                    Manage documents and
                    revisions.
                  </span>

                </div>

                <span className="settings-card-arrow">
                  →
                </span>

              </button>


              {/* APPROVALS */}

              <button
                className="settings-card"
                onClick={() =>
                  navigateTo(
                    "approvals"
                  )
                }
              >

                <div className="settings-card-icon">
                  ✓
                </div>

                <div>

                  <strong>
                    Workflow & Approvals
                  </strong>

                  <span>
                    Configure document
                    workflows.
                  </span>

                </div>

                <span className="settings-card-arrow">
                  →
                </span>

              </button>


            </div>

          </section>

        </section>

      )}


      {/* ====================================================
          UPLOAD MODAL
          ==================================================== */}

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

          <div className="upload-modal">


            {/* MODAL HEADER */}

            <div className="modal-header">

              <div>

                <p className="eyebrow">
                  CUSTOMER RESPONSE
                </p>

                <h3>
                  Upload Transmittal
                </h3>

                <p>
                  Upload a customer PDF.
                  The system will analyse
                  it automatically.
                </p>

              </div>


              <button
                className="modal-close"
                onClick={
                  closeUploadModal
                }
                disabled={
                  uploading
                }
              >
                ×
              </button>

            </div>


            {/* MODAL BODY */}

            <div className="modal-body">


              {/* PROJECT */}

              <div className="form-group">

                <label htmlFor="project-id">
                  Project ID
                </label>

                <input
                  id="project-id"
                  type="text"
                  value={
                    projectId
                  }
                  onChange={(event) =>
                    setProjectId(
                      event.target.value
                    )
                  }
                  placeholder="Enter project ID"
                  disabled={
                    uploading
                  }
                />

                <small>
                  The transmittal will be
                  associated with this
                  project.
                </small>

              </div>


              {/* FILE */}

              <div className="form-group">

                <label>
                  Customer Transmittal
                  PDF
                </label>


                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={
                    handleFileChange
                  }
                  disabled={
                    uploading
                  }
                  hidden
                />


                {!selectedFile ? (

                  <button
                    type="button"
                    className="drop-zone"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={
                      uploading
                    }
                  >

                    <div className="upload-icon">
                      ↑
                    </div>

                    <strong>
                      Click to select a
                      PDF
                    </strong>

                    <span>
                      PDF files only ·
                      Maximum 20 MB
                    </span>

                  </button>

                ) : (

                  <div className="selected-file">

                    <div className="pdf-icon">
                      PDF
                    </div>

                    <div className="selected-file-info">

                      <strong>
                        {
                          selectedFile.name
                        }
                      </strong>

                      <span>
                        {formatFileSize(
                          selectedFile.size
                        )}
                      </span>

                    </div>


                    {!uploading && (

                      <button
                        type="button"
                        className="remove-file"
                        onClick={() => {

                          setSelectedFile(
                            null
                          );

                          if (
                            fileInputRef.current
                          ) {

                            fileInputRef.current.value =
                              "";

                          }

                        }}
                      >
                        ×
                      </button>

                    )}

                  </div>

                )}

              </div>


              {/* AUTOMATION FLOW */}

              <div className="automation-info">


                <div className="automation-step">

                  <span>
                    1
                  </span>

                  <div>

                    <strong>
                      Upload
                    </strong>

                    <small>
                      Store the customer
                      PDF
                    </small>

                  </div>

                </div>


                <div className="automation-line"></div>


                <div className="automation-step">

                  <span>
                    2
                  </span>

                  <div>

                    <strong>
                      Analyse
                    </strong>

                    <small>
                      Extract documents
                      and responses
                    </small>

                  </div>

                </div>


                <div className="automation-line"></div>


                <div className="automation-step">

                  <span>
                    3
                  </span>

                  <div>

                    <strong>
                      Process
                    </strong>

                    <small>
                      Match against
                      internal documents
                    </small>

                  </div>

                </div>


              </div>


              {/* PROGRESS */}

              {uploading && (

                <div className="upload-progress">

                  <div className="loading-spinner"></div>

                  <div>

                    <strong>
                      {uploadStep}
                    </strong>

                    <span>
                      Please don't close
                      this window.
                    </span>

                  </div>

                </div>

              )}

            </div>


            {/* MODAL FOOTER */}

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
                    Upload & Analyse

                    <span>
                      →
                    </span>
                  </>

                )}

              </button>

            </div>


          </div>

        </div>

      )}


    </Layout>

  );
}


// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  value,
  icon,
}) {

  return (

    <div className="summary-card">

      <div className="summary-icon">
        {icon}
      </div>

      <div>

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

      </div>

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
    normalized ===
    "ANALYSED"
  ) {

    className =
      "status-badge success";

  }


  if (
    normalized ===
    "UPLOADED"
  ) {

    className =
      "status-badge warning";

  }


  if (
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

      {normalized.replaceAll(
        "_",
        " "
      )}

    </span>

  );

}


// ============================================================
// RESPONSE BADGE
// ============================================================

function ResponseBadge({
  response,
}) {

  const normalized =
    String(
      response ||
        "UNKNOWN"
    ).toUpperCase();

  let className =
    "response-badge neutral";


  if (
    normalized ===
    "APPROVED"
  ) {

    className =
      "response-badge approved";

  }


  if (
    normalized ===
    "COMMENTED"
  ) {

    className =
      "response-badge commented";

  }


  if (
    normalized ===
    "INFORMATION"
  ) {

    className =
      "response-badge information";

  }


  return (

    <span
      className={
        className
      }
    >

      {normalized}

    </span>

  );

}


// ============================================================
// PROCESSING BADGE
// ============================================================

function ProcessingBadge({
  processed,
  action,
  error,
}) {


  if (
    action ===
    "BLOCKED_UNMATCHED_DOCUMENT"
  ) {

    return (

      <div className="processing-cell">

        <span className="status-badge danger">
          BLOCKED
        </span>

        <small>
          {error ||
            "Document is not mapped"}
        </small>

      </div>

    );

  }


  if (
    action ===
    "PROCESSING_ERROR"
  ) {

    return (

      <div className="processing-cell">

        <span className="status-badge danger">
          ERROR
        </span>

        <small>
          {error ||
            "Processing failed"}
        </small>

      </div>

    );

  }


  if (processed) {

    return (

      <div className="processing-cell">

        <span className="status-badge success">
          PROCESSED
        </span>

        <small>
          {String(
            action || ""
          ).replaceAll(
            "_",
            " "
          )}
        </small>

      </div>

    );

  }


  return (

    <span className="status-badge warning">
      PENDING
    </span>

  );

}


// ============================================================
// TRANSMITTAL DETAILS
// ============================================================

function TransmittalDetails({
  data,
  onClose,
}) {

  const transmittal =
    data?.transmittal ||
    {};

  const documents =
    data?.documents ||
    [];


  return (

    <section className="panel details-panel">


      {/* HEADER */}

      <div className="details-header">

        <div>

          <p className="eyebrow">

            TRANSMITTAL #
            {
              transmittal.id
            }

          </p>

          <h3>

            {
              transmittal.transmittal_reference ||
              transmittal.file_name ||
              "Transmittal"
            }

          </h3>

          <p className="details-subtitle">

            {
              transmittal.customer_name ||
              "Unknown Customer"
            }

          </p>

        </div>


        <button
          className="close-button"
          onClick={
            onClose
          }
        >
          Close
        </button>

      </div>


      {/* METADATA */}

      <div className="metadata-grid">


        <Metadata
          label="Customer"
          value={
            transmittal.customer_name ||
            "—"
          }
        />


        <Metadata
          label="Reference"
          value={
            transmittal.transmittal_reference ||
            "—"
          }
        />


        <Metadata
          label="Transmittal Date"
          value={
            transmittal.transmittal_date ||
            "—"
          }
        />


        <Metadata
          label="Analysis Status"
          value={
            transmittal.analysis_status ||
            "—"
          }
        />


        <Metadata
          label="File"
          value={
            transmittal.file_name ||
            "—"
          }
        />


      </div>


      {/* DOCUMENT RESPONSES */}

      <div className="section-heading">

        <div>

          <h4>
            Document Responses
          </h4>

          <p>
            Customer response and
            internal document-control
            status.
          </p>

        </div>


        <span className="document-count">

          {documents.length}
          {" "}
          items

        </span>

      </div>


      {documents.length ===
        0 ? (

        <div className="empty-state">
          No document responses
          found.
        </div>

      ) : (

        <div className="response-list">

          {documents.map(
            (item) => (

              <div
                className="response-card"
                key={
                  item.id
                }
              >


                <div className="response-main">


                  <div className="response-number">

                    <span>
                      #
                      {
                        item.id
                      }
                    </span>

                    <strong>
                      {
                        item.customer_document_number ||
                        "—"
                      }
                    </strong>

                  </div>


                  <div className="description">

                    <strong>
                      {
                        item.description ||
                        "No description"
                      }
                    </strong>

                    <span>
                      Customer revision:{" "}
                      {
                        item.customer_revision ||
                        "—"
                      }
                    </span>

                  </div>


                  <ResponseBadge
                    response={
                      item.response_type
                    }
                  />

                </div>


                <div className="response-info">


                  <div>

                    <label>
                      Internal Revision
                    </label>

                    <strong>
                      {
                        item.internal_revision ||
                        "Not created"
                      }
                    </strong>

                  </div>


                  <div>

                    <label>
                      Match
                    </label>

                    <strong
                      className={
                        item.document_match_status ===
                        "MATCHED"
                          ? "text-success"
                          : "text-danger"
                      }
                    >

                      {
                        item.document_match_status ||
                        "UNMAPPED"
                      }

                    </strong>

                  </div>


                  <div>

                    <label>
                      Processing
                    </label>

                    <ProcessingBadge
                      processed={
                        item.response_processed
                      }
                      action={
                        item.response_action
                      }
                      error={
                        item.response_processing_error
                      }
                    />

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
// METADATA
// ============================================================

function Metadata({
  label,
  value,
}) {

  return (

    <div className="metadata-item">

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
// PROFILE HELPERS
// ============================================================

function formatRole(role) {
  const roles = {
    admin: "Administrator",
    document_controller: "Document Controller",
    checker: "Checker",
    approver: "Approver",
  };
  return roles[String(role || "").toLowerCase()] || role || "User";
}

function ProfileDetail({ label, value }) {
  return (
    <div className="profile-detail-item">
      <label>{label}</label>
      <strong>{value}</strong>
    </div>
  );
}


// ============================================================
// FILE SIZE
// ============================================================

function formatFileSize(
  bytes
) {

  if (!bytes) {
    return "0 KB";
  }


  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
  ];


  const index =
    Math.floor(
      Math.log(bytes) /
        Math.log(1024)
    );


  return `${(
    bytes /
    Math.pow(
      1024,
      index
    )
  ).toFixed(
    index === 0
      ? 0
      : 1
  )} ${
    units[index]
  }`;

}


export default App;