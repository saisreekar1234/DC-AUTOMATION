import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function DocumentRegisterImport({ project, onImported }) {
  const { isAdmin } = useAuth();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!isAdmin) return null;

  async function importRegister() {
    if (!file) return;
    try {
      setBusy(true);
      setError("");
      setMessage("");
      const formData = new FormData();
      formData.append("workbook", file);
      const response = await api.post(`/document-register-import/${project.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const summary = response.data?.summary || {};
      setMessage(`Imported ${summary.imported || 0}, updated ${summary.updated || 0}, created ${summary.revisions_created || 0} revisions.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      if (onImported) onImported(summary);
    } catch (err) {
      setError(err.response?.data?.message || "Excel import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 18, padding: 16, border: "1px solid #d7e1ef", borderRadius: 14, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <strong>Import Master Document Register</strong>
          <div style={{ marginTop: 4, color: "#65758b", fontSize: 13 }}>
            Reads the <b>INTERNAL MDR</b> sheet and creates/updates this project's document register and revision history.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button type="button" onClick={importRegister} disabled={!file || busy}>
            {busy ? "Importing…" : "Import Excel"}
          </button>
        </div>
      </div>
      {message && <div style={{ marginTop: 10, color: "#177245", fontSize: 13 }}>{message}</div>}
      {error && <div style={{ marginTop: 10, color: "#b42318", fontSize: 13 }}>{error}</div>}
    </div>
  );
}
