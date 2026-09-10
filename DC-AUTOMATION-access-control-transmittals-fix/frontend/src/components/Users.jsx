import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "./users.css";

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "document_controller",
  is_active: true,
};

function displayRole(role) {
  const roles = {
    admin: "Administrator",
    document_controller: "Document Controller",
    checker: "Checker",
    approver: "Approver",
  };
  return roles[String(role || "").toLowerCase()] || role || "—";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Users() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [userModal, setUserModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [passwordModal, setPasswordModal] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [projectModal, setProjectModal] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [assignmentPermissions, setAssignmentPermissions] = useState({});
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/users");
      setUsers(response.data?.users || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects() {
    try {
      const response = await api.get("/projects");
      setProjects(response.data?.projects || response.data || []);
    } catch (err) {
      console.error("LOAD PROJECTS ERROR:", err);
    }
  }

  useEffect(() => {
    loadUsers();
    loadProjects();
  }, []);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return users;
    return users.filter((item) =>
      [item.name, item.email, item.role, String(item.id)]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value)),
    );
  }, [users, search]);

  function openCreate() {
    setError("");
    setNotice("");
    setForm(EMPTY_FORM);
    setUserModal({ mode: "create" });
  }

  function openEdit(user) {
    setError("");
    setNotice("");
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "document_controller",
      is_active: user.is_active !== false,
    });
    setUserModal({ mode: "edit", user });
  }

  async function saveUser(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");

      if (userModal.mode === "create") {
        await api.post("/users", {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });
        setNotice("User created successfully.");
      } else {
        await api.patch(`/users/${userModal.user.id}`, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          is_active: form.is_active,
        });
        setNotice("User updated successfully.");
      }

      setUserModal(null);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateUser(user) {
    try {
      setSaving(true);
      setError("");
      await api.delete(`/users/${user.id}`);
      setConfirmAction(null);
      setNotice(`Account for ${user.name || user.email} has been disabled.`);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to disable user.");
    } finally {
      setSaving(false);
    }
  }

  async function reactivateUser(user) {
    try {
      setSaving(true);
      setError("");
      await api.patch(`/users/${user.id}`, { is_active: true });
      setNotice(`Account for ${user.name || user.email} has been reactivated.`);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to reactivate user.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await api.post(`/users/${passwordModal.id}/reset-password`, {
        password: newPassword,
      });
      setPasswordModal(null);
      setNewPassword("");
      setNotice("Password reset successfully.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to reset password.");
    } finally {
      setSaving(false);
    }
  }

  async function openProjectAssignment(user) {
    try {
      setError("");
      setNotice("");
      setProjectModal(user);
      setAssignmentLoading(true);

      if (projects.length === 0) {
        setAssignedProjects([]);
        setAssignmentPermissions({});
        return;
      }

      const response = await api.get(`/project-members/projects/${projects[0].id}`);
      // The endpoint above is project-scoped, so we load each project below.
      const nextAssigned = [];
      const nextPermissions = {};

      for (const project of projects) {
        const result = project.id === projects[0]?.id
          ? response
          : await api.get(`/project-members/projects/${project.id}`);
        const member = (result.data?.members || []).find(
          (item) => Number(item.user_id) === Number(user.id),
        );
        if (member) {
          nextAssigned.push(Number(project.id));
          nextPermissions[project.id] = member.permission_level || "member";
        }
      }

      setAssignedProjects(nextAssigned);
      setAssignmentPermissions(nextPermissions);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load project assignments.");
      setProjectModal(null);
    } finally {
      setAssignmentLoading(false);
    }
  }

  async function saveProjectAssignment() {
    if (!projectModal) return;

    try {
      setSaving(true);
      setError("");

      for (const project of projects) {
        const shouldBeAssigned = assignedProjects.includes(Number(project.id));
        const permission = assignmentPermissions[project.id] || "member";

        let members = [];
        try {
          const response = await api.get(`/project-members/projects/${project.id}`);
          members = response.data?.members || [];
        } catch {
          continue;
        }

        const current = members.find(
          (item) => Number(item.user_id) === Number(projectModal.id),
        );

        if (shouldBeAssigned && !current) {
          await api.post(`/project-members/projects/${project.id}`, {
            user_id: Number(projectModal.id),
            permission_level: permission,
          });
        } else if (shouldBeAssigned && current && current.permission_level !== permission) {
          await api.patch(
            `/project-members/projects/${project.id}/users/${projectModal.id}`,
            { permission_level: permission },
          );
        } else if (!shouldBeAssigned && current) {
          await api.delete(`/project-members/projects/${project.id}/users/${projectModal.id}`);
        }
      }

      setProjectModal(null);
      setNotice("Project access updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to update project access.");
    } finally {
      setSaving(false);
    }
  }

  function toggleProject(projectId) {
    const id = Number(projectId);
    setAssignedProjects((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <section className="users-page">
      <div className="users-page-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h3>User Management</h3>
          <p>Manage system users, roles, status and project access.</p>
        </div>
        <div className="users-heading-actions">
          <button className="secondary-action" onClick={() => { loadUsers(); loadProjects(); }} disabled={loading}>
            ↻ Refresh
          </button>
          <button className="primary-action" onClick={openCreate}>＋ Add User</button>
        </div>
      </div>

      {error && <div className="users-alert error">{error}</div>}
      {notice && <div className="users-alert success">{notice}</div>}

      <section className="users-panel">
        <div className="users-toolbar">
          <div>
            <strong>System Users</strong>
            <span>{users.length} users</span>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, role or ID..."
            className="users-search"
          />
        </div>

        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th className="users-actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="users-empty">Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="5" className="users-empty">No users found.</td></tr>
              ) : filteredUsers.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{String(item.name || item.email || "U").charAt(0).toUpperCase()}</div>
                      <div>
                        <strong>{item.name || "Unnamed user"}</strong>
                        <span>{item.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="role-badge">{displayRole(item.role)}</span></td>
                  <td>
                    <span className={`user-status ${item.is_active ? "active" : "inactive"}`}>
                      <i /> {item.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td>{formatDate(item.created_at)}</td>
                  <td className="users-actions">
                    <button onClick={() => openEdit(item)}>Edit</button>
                    <button onClick={() => openProjectAssignment(item)}>Projects</button>
                    <button onClick={() => { setPasswordModal(item); setNewPassword(""); setError(""); }}>Reset password</button>
                    {item.is_active ? (
                      <button className="danger-action" onClick={() => setConfirmAction({ type: "disable", user: item })}>Disable</button>
                    ) : (
                      <button className="success-action" onClick={() => reactivateUser(item)} disabled={saving}>Reactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {userModal && (
        <div className="users-modal-backdrop" onMouseDown={() => !saving && setUserModal(null)}>
          <section className="users-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="users-modal-header">
              <div><p className="eyebrow">USER ACCOUNT</p><h4>{userModal.mode === "create" ? "Add User" : "Edit User"}</h4><span>{userModal.mode === "create" ? "Create a new Document Control account." : "Update account details and access status."}</span></div>
              <button onClick={() => setUserModal(null)}>×</button>
            </div>
            <form onSubmit={saveUser}>
              <div className="users-form-grid">
                <label>Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
                <label>Email address<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
                {userModal.mode === "create" && <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength="8" required /></label>}
                <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="document_controller">Document Controller</option><option value="admin">Administrator</option><option value="checker">Checker</option><option value="approver">Approver</option></select></label>
              </div>
              {userModal.mode === "edit" && <label className="user-toggle"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /><span><strong>Account active</strong><small>Disabled users cannot authenticate.</small></span></label>}
              <div className="users-modal-footer"><button type="button" className="secondary-action" onClick={() => setUserModal(null)}>Cancel</button><button type="submit" className="primary-action" disabled={saving}>{saving ? "Saving..." : "Save User"}</button></div>
            </form>
          </section>
        </div>
      )}

      {passwordModal && (
        <div className="users-modal-backdrop" onMouseDown={() => !saving && setPasswordModal(null)}>
          <section className="users-modal small" onMouseDown={(event) => event.stopPropagation()}>
            <div className="users-modal-header"><div><p className="eyebrow">SECURITY</p><h4>Reset Password</h4><span>{passwordModal.name} · {passwordModal.email}</span></div><button onClick={() => setPasswordModal(null)}>×</button></div>
            <form onSubmit={resetPassword}><label>New password<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength="8" required placeholder="Minimum 8 characters" /></label><div className="users-modal-footer"><button type="button" className="secondary-action" onClick={() => setPasswordModal(null)}>Cancel</button><button type="submit" className="primary-action" disabled={saving}>{saving ? "Resetting..." : "Reset Password"}</button></div></form>
          </section>
        </div>
      )}

      {projectModal && (
        <div className="users-modal-backdrop" onMouseDown={() => !saving && setProjectModal(null)}>
          <section className="users-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="users-modal-header"><div><p className="eyebrow">ACCESS CONTROL</p><h4>Project Access</h4><span>Assign projects to {projectModal.name}.</span></div><button onClick={() => setProjectModal(null)}>×</button></div>
            {assignmentLoading ? <div className="users-empty">Loading project access...</div> : <div className="project-access-list">{projects.map((project) => { const selected = assignedProjects.includes(Number(project.id)); return <div className={`project-access-row ${selected ? "selected" : ""}`} key={project.id}><label><input type="checkbox" checked={selected} onChange={() => toggleProject(project.id)} /><span><strong>{project.project_code}</strong><small>{project.project_name}</small></span></label>{selected && <select value={assignmentPermissions[project.id] || "member"} onChange={(e) => setAssignmentPermissions({ ...assignmentPermissions, [project.id]: e.target.value })}><option value="viewer">Viewer</option><option value="member">Member</option><option value="manager">Manager</option></select>}</div>; })}</div>}
            <div className="users-modal-footer"><button className="secondary-action" onClick={() => setProjectModal(null)}>Cancel</button><button className="primary-action" onClick={saveProjectAssignment} disabled={saving || assignmentLoading}>{saving ? "Saving..." : "Save Access"}</button></div>
          </section>
        </div>
      )}
      {confirmAction && (
        <div className="users-modal-backdrop" onMouseDown={() => !saving && setConfirmAction(null)}>
          <section className="users-modal small" onMouseDown={(event) => event.stopPropagation()}>
            <div className="users-modal-header">
              <div><p className="eyebrow">ACCOUNT CONTROL</p><h4>Disable user account?</h4><span>This prevents the user from signing in. Existing documents and audit history remain intact.</span></div>
              <button type="button" onClick={() => setConfirmAction(null)}>×</button>
            </div>
            <div className="confirm-copy"><strong>{confirmAction.user.name || confirmAction.user.email}</strong><span>{confirmAction.user.email}</span></div>
            <div className="users-modal-footer"><button type="button" className="secondary-action" onClick={() => setConfirmAction(null)}>Cancel</button><button type="button" className="danger-primary" onClick={() => deactivateUser(confirmAction.user)} disabled={saving}>{saving ? "Disabling..." : "Disable Account"}</button></div>
          </section>
        </div>
      )}

    </section>
  );
}

export default Users;
