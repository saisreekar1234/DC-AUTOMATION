import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import api from "../api";
import "./profile-editor.css";

export default function ProfileEditor({ onClose }) {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState(user?.name || user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user?.name || user?.full_name || "");
    setEmail(user?.email || "");
  }, [user]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await api.patch("/profile/me", { name: name.trim(), email: email.trim() });
      const updated = response.data?.user;
      if (updated) updateUser(updated);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update your profile.");
    } finally { setSaving(false); }
  }

  async function changePassword(event) {
    event.preventDefault();
    setMessage(""); setError("");
    if (newPassword.length < 8) return setError("New password must contain at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("New password and confirmation do not match.");
    setPasswordSaving(true);
    try {
      await api.post("/profile/me/change-password", { currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setMessage("Password changed successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to change your password.");
    } finally { setPasswordSaving(false); }
  }

  return (
    <div className="profile-editor-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="profile-editor" role="dialog" aria-modal="true">
        <header className="profile-editor-header">
          <div><span className="profile-kicker">{t("account")}</span><h2>{t("editProfile")}</h2><p>Manage your personal details and account security.</p></div>
          <button className="profile-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="profile-editor-body">
          {message && <div className="profile-success">✓ {message}</div>}
          {error && <div className="profile-error">! {error}</div>}
          <form className="profile-section" onSubmit={saveProfile}>
            <div className="profile-section-title"><div className="avatar-large">{(name || email || "U").charAt(0).toUpperCase()}</div><div><h3>Personal information</h3><p>These details are shown in your Document Control workspace.</p></div></div>
            <div className="profile-grid">
              <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
              <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
              <label>Role<input value={user?.role || ""} disabled /></label>
              <label>User ID<input value={user?.id ?? ""} disabled /></label>
            </div>
            <div className="profile-actions"><button type="button" onClick={onClose}>{t("cancel")}</button><button className="primary" disabled={saving}>{saving ? "Saving..." : t("save")}</button></div>
          </form>
          <form className="profile-section" onSubmit={changePassword}>
            <div className="profile-section-title"><div className="security-icon">⌁</div><div><h3>{t("changePassword")}</h3><p>Use a strong password of at least 8 characters.</p></div></div>
            <div className="profile-grid one-row">
              <label>{t("currentPassword")}<input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label>
              <label>{t("newPassword")}<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required /></label>
              <label>{t("confirmPassword")}<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required /></label>
            </div>
            <div className="profile-actions"><button type="submit" className="primary" disabled={passwordSaving}>{passwordSaving ? "Updating..." : t("changePassword")}</button></div>
          </form>
        </div>
      </section>
    </div>
  );
}
