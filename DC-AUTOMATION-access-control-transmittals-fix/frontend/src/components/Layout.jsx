import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./enterprise-shell.css";

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    projects: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></>,
    settings: <><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.4h.9a1.7 1.7 0 0 0 1.5-1A1.7 1.7 0 0 0 8.1 9L8 8.9l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V6h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.9 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2.4H21a1.7 1.7 0 0 0-1.6.6Z"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.2 2.5-5 6-5s6 1.8 6 5M16 5.5a3 3 0 0 1 0 5.1M17 15c2.4.4 4 2 4 5"/></>,
    user: <><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.7-3.6 3-5.4 7-5.4s6.3 1.8 7 5.4"/></>,
    lock: <><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M21 4v16"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    close: <><path d="M6 6l12 12M18 6 6 18"/></>,
    shield: <><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  };

  return <svg {...common}>{icons[name]}</svg>;
}

export default function Layout({ activePage, onNavigate, role, children }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMode, setProfileMode] = useState("view");
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const navigate = (page) => {
    setMobileOpen(false);
    onNavigate(page);
  };

  const initials = String(user?.name || user?.email || "U")
    .trim()
    .slice(0, 2)
    .toUpperCase();

  function openProfile(mode = "view") {
    setProfile({
      name: user?.name || "",
      email: user?.email || "",
    });
    setProfileMode(mode);
    setProfileMessage("");
    setProfileError("");
    setProfileOpen(true);
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      setProfileBusy(true);
      setProfileError("");
      await api.patch(`/users/${user.id}`, {
        name: profile.name.trim(),
        email: profile.email.trim(),
      });
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(
        error.response?.data?.message || "Unable to update your profile."
      );
    } finally {
      setProfileBusy(false);
    }
  }

  return (
    <div className="dc-shell">
      <aside className={`dc-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <button
          className="dc-brand"
          onClick={() => navigate("projects")}
          title="Open Projects"
          type="button"
        >
          <div className="dc-brand-mark">
            <img src="/sulzer.jpg" alt="Sulzer" />
            <i />
          </div>
          <div className="dc-brand-copy">
            <strong>DOC CONTROL</strong>
            <span>WORKSPACE</span>
          </div>
        </button>

        <div className="dc-nav-label">WORKSPACE</div>
        <nav className="dc-nav" aria-label="Primary navigation">
          <button
            className={activePage === "projects" ? "dc-nav-item active" : "dc-nav-item"}
            onClick={() => navigate("projects")}
            type="button"
          >
            <Icon name="projects" />
            <span>Projects</span>
            <Icon name="chevron" size={15} />
          </button>

          <button
            className={activePage === "settings" ? "dc-nav-item active" : "dc-nav-item"}
            onClick={() => navigate("settings")}
            type="button"
          >
            <Icon name="settings" />
            <span>Settings</span>
            <Icon name="chevron" size={15} />
          </button>

          {role === "admin" && (
            <button
              className={activePage === "users" ? "dc-nav-item active" : "dc-nav-item"}
              onClick={() => navigate("users")}
              type="button"
            >
              <Icon name="users" />
              <span>Users</span>
              <Icon name="chevron" size={15} />
            </button>
          )}
        </nav>

        <div className="dc-sidebar-spacer" />

        <button
          className="dc-sidebar-workspace"
          type="button"
          onClick={() => navigate("projects")}
        >
          <span className="dc-sidebar-workspace-mark"><Icon name="home" size={14} /></span>
          <span>
            <strong>Document Control</strong>
            <small>Controlled project information</small>
          </span>
          <Icon name="chevron" size={14} />
        </button>

        <button
          className="dc-user"
          onClick={() => openProfile("view")}
          title="Open profile and security"
          type="button"
        >
          <span className="dc-user-avatar">{initials}</span>
          <span className="dc-user-info">
            <strong>{user?.name || "User"}</strong>
            <small>{user?.role || "member"}</small>
          </span>
          <Icon name="user" size={16} />
        </button>

        <button className="dc-signout" onClick={logout} type="button">
          <Icon name="logout" size={15} />
          <span>Sign out</span>
        </button>
      </aside>

      {mobileOpen && (
        <button
          className="dc-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          type="button"
        />
      )}

      <main className="dc-main">
        <button
          className="dc-mobile-menu"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          type="button"
        >
          <Icon name="menu" />
        </button>
        <div className="dc-content">{children}</div>
      </main>

      {profileOpen && (
        <div
          className="dc-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProfileOpen(false);
          }}
        >
          <section className="dc-profile-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <span>ACCOUNT CENTRE</span>
                <h2>Profile &amp; security</h2>
                <p>Manage your account details and security preferences.</p>
              </div>
              <button onClick={() => setProfileOpen(false)} type="button" aria-label="Close">
                <Icon name="close" size={19} />
              </button>
            </header>

            <div className="dc-profile-summary">
              <span className="large-avatar">{initials}</span>
              <div>
                <strong>{user?.name || "User"}</strong>
                <span>{user?.email || ""}</span>
                <em>{user?.role || "member"}</em>
              </div>
            </div>

            <div className="dc-profile-tabs">
              <button className={profileMode === "view" ? "active" : ""} onClick={() => setProfileMode("view")} type="button">
                Account
              </button>
              <button className={profileMode === "edit" ? "active" : ""} onClick={() => setProfileMode("edit")} type="button">
                <Icon name="edit" size={14} /> Edit profile
              </button>
              <button className={profileMode === "password" ? "active" : ""} onClick={() => setProfileMode("password")} type="button">
                <Icon name="lock" size={14} /> Password
              </button>
            </div>

            {profileMessage && <div className="profile-success">{profileMessage}</div>}
            {profileError && <div className="profile-error">{profileError}</div>}

            {profileMode === "view" && (
              <div className="profile-panel">
                <div className="profile-info-grid">
                  <div><span>Name</span><strong>{user?.name || "—"}</strong></div>
                  <div><span>Email</span><strong>{user?.email || "—"}</strong></div>
                  <div><span>Role</span><strong>{user?.role || "—"}</strong></div>
                  <div><span>Account status</span><strong>Active</strong></div>
                </div>
                <div className="security-note">
                  <Icon name="shield" />
                  <div>
                    <strong>Protected workspace</strong>
                    <p>Your access is governed by authenticated sessions and project-level permissions.</p>
                  </div>
                </div>
              </div>
            )}

            {profileMode === "edit" && (
              <form className="profile-form" onSubmit={saveProfile}>
                <label>
                  Name
                  <input value={profile.name} onChange={(event) => setProfile((p) => ({ ...p, name: event.target.value }))} required />
                </label>
                <label>
                  Email
                  <input type="email" value={profile.email} onChange={(event) => setProfile((p) => ({ ...p, email: event.target.value }))} required />
                </label>
                <div className="profile-actions">
                  <button type="button" onClick={() => setProfileMode("view")}>Cancel</button>
                  <button className="profile-primary" disabled={profileBusy} type="submit">
                    {profileBusy ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            )}

            {profileMode === "password" && (
              <div className="profile-panel">
                <div className="password-card">
                  <Icon name="lock" size={22} />
                  <div>
                    <strong>Password management</strong>
                    <p>Use the authenticated password-change workflow when it is enabled for your account. Administrators can also reset user passwords from User Management.</p>
                    {role === "admin" && (
                      <button
                        type="button"
                        className="profile-primary"
                        onClick={() => {
                          setProfileOpen(false);
                          navigate("users");
                        }}
                      >
                        Open User Management
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
