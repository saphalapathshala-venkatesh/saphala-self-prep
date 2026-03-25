"use client";

import { useEffect, useRef, useState } from "react";

type User = {
  id: string;
  email: string | null;
  mobile: string | null;
  fullName: string | null;
  role: string;
  isActive: boolean;
  allowMultiDevice: boolean;
  activeSessionCount: number;
  createdAt: string;
};

type ResetState = {
  userId: string;
  email: string;
  newPassword: string;
  confirmPassword: string;
  showNew: boolean;
  showConfirm: boolean;
  saving: boolean;
  error: string;
  success: string;
};

type CreateUserState = {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  showPassword: boolean;
  saving: boolean;
  error: string;
  success: string;
};

type EditContactState = {
  userId: string;
  displayName: string;
  email: string;
  mobile: string;
  saving: boolean;
  error: string;
  success: string;
};

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%";
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  const all = upper + lower + digits + special;
  const parts = [pick(upper), pick(upper), pick(lower), pick(lower), pick(digits), pick(digits), pick(special)];
  for (let i = 0; i < 5; i++) parts.push(pick(all));
  return parts.sort(() => Math.random() - 0.5).join("");
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Record<string, { msg: string; ok: boolean }>>({});
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});
  const [reset, setReset] = useState<ResetState | null>(null);
  const [createUser, setCreateUser] = useState<CreateUserState | null>(null);
  const [editContact, setEditContact] = useState<EditContactState | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const createModalRef = useRef<HTMLDivElement>(null);
  const editContactModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!reset) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setReset(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset]);

  useEffect(() => {
    if (!createUser) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCreateUser(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createUser]);

  useEffect(() => {
    if (!editContact) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setEditContact(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editContact]);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function saveRole(userId: string) {
    const newRole = pendingRoles[userId];
    if (!newRole) return;
    setFeedback((prev) => ({ ...prev, [userId]: { msg: "Saving…", ok: true } }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setPendingRoles((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      setFeedback((prev) => ({ ...prev, [userId]: { msg: "Saved!", ok: true } }));
    } catch (err: unknown) {
      setFeedback((prev) => ({
        ...prev,
        [userId]: { msg: err instanceof Error ? err.message : "Failed", ok: false },
      }));
    }
  }

  async function clearSessions(userId: string) {
    setFeedback((prev) => ({ ...prev, [userId]: { msg: "Clearing…", ok: true } }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/sessions`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, activeSessionCount: 0 } : u));
      setFeedback((prev) => ({ ...prev, [userId]: { msg: `Cleared ${data.cleared} session(s)`, ok: true } }));
    } catch (err: unknown) {
      setFeedback((prev) => ({ ...prev, [userId]: { msg: err instanceof Error ? err.message : "Failed", ok: false } }));
    }
  }

  async function resetDevice(userId: string) {
    if (!confirm("Reset device binding for this user? This will also revoke all active sessions, immediately logging them out from all devices. They can then log in fresh from any new device.")) return;
    setFeedback((prev) => ({ ...prev, [userId]: { msg: "Resetting…", ok: true } }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/device-reset`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, activeSessionCount: 0 } : u));
      setFeedback((prev) => ({
        ...prev,
        [userId]: { msg: `Device reset — ${data.devicesCleared} device(s) cleared, ${data.sessionsRevoked} session(s) revoked`, ok: true },
      }));
    } catch (err: unknown) {
      setFeedback((prev) => ({ ...prev, [userId]: { msg: err instanceof Error ? err.message : "Failed", ok: false } }));
    }
  }

  async function toggleMultiDevice(userId: string, allow: boolean) {
    setFeedback((prev) => ({ ...prev, [userId]: { msg: "Saving…", ok: true } }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/allow-multi-device`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowMultiDevice: allow }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, allowMultiDevice: allow } : u));
      setFeedback((prev) => ({ ...prev, [userId]: { msg: allow ? "Multi-device enabled" : "Single-device enforced", ok: true } }));
    } catch (err: unknown) {
      setFeedback((prev) => ({ ...prev, [userId]: { msg: err instanceof Error ? err.message : "Failed", ok: false } }));
    }
  }

  function openResetModal(user: User) {
    setReset({
      userId: user.id,
      email: user.email || user.mobile || "",
      newPassword: "",
      confirmPassword: "",
      showNew: false,
      showConfirm: false,
      saving: false,
      error: "",
      success: "",
    });
  }

  async function submitReset() {
    if (!reset) return;
    setReset((r) => r && { ...r, saving: true, error: "", success: "" });
    try {
      const res = await fetch(`/api/admin/users/${reset.userId}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: reset.newPassword,
          confirmPassword: reset.confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setReset((r) => r && { ...r, saving: false, success: "Password reset successfully. The user's sessions have been invalidated.", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      setReset((r) => r && { ...r, saving: false, error: err instanceof Error ? err.message : "Reset failed." });
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setReset(null);
    }
  }

  function handleCreateOverlayClick(e: React.MouseEvent) {
    if (createModalRef.current && !createModalRef.current.contains(e.target as Node)) {
      setCreateUser(null);
    }
  }

  function handleEditContactOverlayClick(e: React.MouseEvent) {
    if (editContactModalRef.current && !editContactModalRef.current.contains(e.target as Node)) {
      setEditContact(null);
    }
  }

  function openCreateUser() {
    setCreateUser({
      fullName: "",
      email: "",
      mobile: "",
      password: generatePassword(),
      showPassword: true,
      saving: false,
      error: "",
      success: "",
    });
  }

  async function submitCreateUser() {
    if (!createUser) return;
    setCreateUser((s) => s && { ...s, saving: true, error: "", success: "" });
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: createUser.fullName,
          email: createUser.email,
          mobile: createUser.mobile,
          password: createUser.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setCreateUser((s) => s && { ...s, saving: false, success: "User created successfully." });
      await fetchUsers();
    } catch (err: unknown) {
      setCreateUser((s) => s && { ...s, saving: false, error: err instanceof Error ? err.message : "Failed to create user." });
    }
  }

  function openEditContact(user: User) {
    setEditContact({
      userId: user.id,
      displayName: user.fullName || user.email || user.mobile || user.id,
      email: user.email || "",
      mobile: user.mobile || "",
      saving: false,
      error: "",
      success: "",
    });
  }

  async function submitEditContact() {
    if (!editContact) return;
    setEditContact((s) => s && { ...s, saving: true, error: "", success: "" });
    try {
      const res = await fetch(`/api/admin/users/${editContact.userId}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editContact.email,
          mobile: editContact.mobile,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setEditContact((s) => s && { ...s, saving: false, success: "Contact details updated." });
      await fetchUsers();
    } catch (err: unknown) {
      setEditContact((s) => s && { ...s, saving: false, error: err instanceof Error ? err.message : "Update failed." });
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Admin — Users</h1>
        <button
          onClick={openCreateUser}
          style={{
            padding: "7px 16px",
            background: "#2D1B69",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Create User
        </button>
      </div>

      {loading && <p>Loading users…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
              <th style={{ padding: "8px 4px" }}>User</th>
              <th style={{ padding: "8px 4px" }}>Mobile</th>
              <th style={{ padding: "8px 4px" }}>Role</th>
              <th style={{ padding: "8px 4px" }}>Sessions</th>
              <th style={{ padding: "8px 4px" }}>Joined</th>
              <th style={{ padding: "8px 4px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 4px" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.fullName || "—"}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>{u.email || "—"}</div>
                </td>
                <td style={{ padding: "8px 4px", fontSize: 13 }}>{u.mobile || "—"}</td>
                <td style={{ padding: "8px 4px" }}>
                  <select
                    value={pendingRoles[u.id] ?? u.role}
                    onChange={(e) =>
                      setPendingRoles((prev) => ({ ...prev, [u.id]: e.target.value }))
                    }
                    style={{ padding: "4px 8px" }}
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </td>
                <td style={{ padding: "8px 4px" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    background: u.activeSessionCount > 0 ? "#dcfce7" : "#f1f5f9",
                    color: u.activeSessionCount > 0 ? "#166534" : "#64748b",
                  }}>
                    {u.activeSessionCount} active
                  </span>
                </td>
                <td style={{ padding: "8px 4px", fontSize: 12, color: "#555" }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: "8px 4px" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={() => saveRole(u.id)}
                      disabled={!pendingRoles[u.id] || pendingRoles[u.id] === u.role}
                      style={{
                        padding: "3px 10px",
                        fontSize: 12,
                        cursor: pendingRoles[u.id] && pendingRoles[u.id] !== u.role ? "pointer" : "not-allowed",
                        opacity: pendingRoles[u.id] && pendingRoles[u.id] !== u.role ? 1 : 0.5,
                        borderRadius: 4,
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                      }}
                    >
                      Save Role
                    </button>
                    <button
                      onClick={() => openResetModal(u)}
                      style={{
                        padding: "3px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                        background: "#fef3c7",
                        border: "1px solid #d97706",
                        borderRadius: 4,
                        color: "#92400e",
                      }}
                    >
                      Reset Pwd
                    </button>
                    {u.activeSessionCount > 0 && (
                      <button
                        onClick={() => clearSessions(u.id)}
                        style={{
                          padding: "3px 10px",
                          fontSize: 12,
                          cursor: "pointer",
                          background: "#fee2e2",
                          border: "1px solid #f87171",
                          borderRadius: 4,
                          color: "#991b1b",
                        }}
                      >
                        Clear Sessions
                      </button>
                    )}
                    {!u.allowMultiDevice && (
                      <button
                        onClick={() => resetDevice(u.id)}
                        title="Clears device binding AND revokes all sessions so user can log in from a new device"
                        style={{
                          padding: "3px 10px",
                          fontSize: 12,
                          cursor: "pointer",
                          background: "#fdf4ff",
                          border: "1px solid #d946ef",
                          borderRadius: 4,
                          color: "#86198f",
                        }}
                      >
                        Reset Device
                      </button>
                    )}
                    <button
                      onClick={() => toggleMultiDevice(u.id, !u.allowMultiDevice)}
                      title={u.allowMultiDevice ? "Multi-device ON — click to restrict to one device" : "Single-device — click to allow multi-device"}
                      style={{
                        padding: "3px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                        background: u.allowMultiDevice ? "#dbeafe" : "#f1f5f9",
                        border: `1px solid ${u.allowMultiDevice ? "#3b82f6" : "#cbd5e1"}`,
                        borderRadius: 4,
                        color: u.allowMultiDevice ? "#1d4ed8" : "#64748b",
                      }}
                    >
                      {u.allowMultiDevice ? "Multi-Device ✓" : "1-Device"}
                    </button>
                    <a
                      href={`/admin/users/${u.id}/attempts`}
                      style={{
                        padding: "3px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        borderRadius: 4,
                        color: "#166534",
                        textDecoration: "none",
                      }}
                    >
                      View Attempts
                    </a>
                    <button
                      onClick={() => openEditContact(u)}
                      style={{
                        padding: "3px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                        background: "#eff6ff",
                        border: "1px solid #93c5fd",
                        borderRadius: 4,
                        color: "#1d4ed8",
                      }}
                    >
                      Edit Contact
                    </button>
                    {feedback[u.id] && (
                      <span style={{ color: feedback[u.id].ok ? "green" : "red", fontSize: 12 }}>
                        {feedback[u.id].msg}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && !error && users.length === 0 && <p>No users found.</p>}

      {/* Reset Password Modal */}
      {reset && (
        <div
          onClick={handleOverlayClick}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            ref={modalRef}
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: "32px 28px",
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              position: "relative",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setReset(null)}
              style={{
                position: "absolute",
                top: 14,
                right: 16,
                background: "none",
                border: "none",
                fontSize: 20,
                cursor: "pointer",
                color: "#666",
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>

            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Reset Password</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#555" }}>
              User: <strong>{reset.email}</strong>
            </p>

            {/* New Password */}
            <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
              New Password
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type={reset.showNew ? "text" : "password"}
                  value={reset.newPassword}
                  onChange={(e) => setReset((r) => r && { ...r, newPassword: e.target.value, error: "", success: "" })}
                  placeholder="Min 8 chars, letter + number"
                  style={{
                    width: "100%",
                    padding: "8px 36px 8px 10px",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setReset((r) => r && { ...r, showNew: !r.showNew })}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#888",
                    fontSize: 13,
                    padding: 0,
                  }}
                >
                  {reset.showNew ? "Hide" : "Show"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const pwd = generatePassword();
                  setReset((r) => r && { ...r, newPassword: pwd, confirmPassword: pwd, showNew: true, showConfirm: true, error: "", success: "" });
                }}
                style={{
                  padding: "8px 12px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#475569",
                  whiteSpace: "nowrap",
                }}
                title="Auto-generate a strong temporary password"
              >
                Generate
              </button>
            </div>

            {/* Confirm Password */}
            <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
              Confirm Password
            </label>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <input
                type={reset.showConfirm ? "text" : "password"}
                value={reset.confirmPassword}
                onChange={(e) => setReset((r) => r && { ...r, confirmPassword: e.target.value, error: "", success: "" })}
                placeholder="Re-enter new password"
                style={{
                  width: "100%",
                  padding: "8px 36px 8px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setReset((r) => r && { ...r, showConfirm: !r.showConfirm })}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#888",
                  fontSize: 13,
                  padding: 0,
                }}
              >
                {reset.showConfirm ? "Hide" : "Show"}
              </button>
            </div>

            {/* Password match indicator */}
            {reset.newPassword && reset.confirmPassword && (
              <p style={{
                fontSize: 12,
                marginBottom: 12,
                marginTop: -12,
                color: reset.newPassword === reset.confirmPassword ? "#16a34a" : "#dc2626",
              }}>
                {reset.newPassword === reset.confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}

            {/* Error / Success feedback */}
            {reset.error && (
              <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12, background: "#fef2f2", padding: "8px 12px", borderRadius: 6, border: "1px solid #fecaca" }}>
                {reset.error}
              </p>
            )}
            {reset.success && (
              <p style={{ color: "#16a34a", fontSize: 13, marginBottom: 12, background: "#f0fdf4", padding: "8px 12px", borderRadius: 6, border: "1px solid #bbf7d0" }}>
                {reset.success}
              </p>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setReset(null)}
                style={{
                  padding: "8px 20px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#334155",
                }}
              >
                {reset.success ? "Close" : "Cancel"}
              </button>
              {!reset.success && (
                <button
                  onClick={submitReset}
                  disabled={reset.saving || !reset.newPassword || !reset.confirmPassword}
                  style={{
                    padding: "8px 20px",
                    background: reset.saving || !reset.newPassword || !reset.confirmPassword ? "#94a3b8" : "#2D1B69",
                    border: "none",
                    borderRadius: 6,
                    cursor: reset.saving || !reset.newPassword || !reset.confirmPassword ? "not-allowed" : "pointer",
                    fontSize: 14,
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  {reset.saving ? "Resetting…" : "Reset Password"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {createUser && (
        <div
          onClick={handleCreateOverlayClick}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            ref={createModalRef}
            style={{ background: "#fff", borderRadius: 10, padding: "32px 28px", width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", position: "relative" }}
          >
            <button onClick={() => setCreateUser(null)} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#666" }}>×</button>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Create User</h2>

            {(["fullName", "email", "mobile"] as const).map((field) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
                  {field === "fullName" ? "Full Name" : field === "email" ? "Email" : "Mobile (10 digits)"}
                </label>
                <input
                  type={field === "email" ? "email" : "text"}
                  value={createUser[field]}
                  onChange={(e) => setCreateUser((s) => s && { ...s, [field]: e.target.value, error: "", success: "" })}
                  placeholder={field === "fullName" ? "Full name" : field === "email" ? "email@example.com" : "10-digit mobile"}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Password</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type={createUser.showPassword ? "text" : "password"}
                    value={createUser.password}
                    onChange={(e) => setCreateUser((s) => s && { ...s, password: e.target.value, error: "", success: "" })}
                    style={{ width: "100%", padding: "8px 36px 8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                  />
                  <button type="button" onClick={() => setCreateUser((s) => s && { ...s, showPassword: !s.showPassword })} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 13 }}>
                    {createUser.showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <button type="button" onClick={() => setCreateUser((s) => s && { ...s, password: generatePassword(), showPassword: true })} style={{ padding: "8px 10px", fontSize: 12, background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Generate
                </button>
              </div>
            </div>

            {createUser.error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12, background: "#fef2f2", padding: "8px 12px", borderRadius: 6, border: "1px solid #fecaca" }}>{createUser.error}</p>}
            {createUser.success && <p style={{ color: "#16a34a", fontSize: 13, marginBottom: 12, background: "#f0fdf4", padding: "8px 12px", borderRadius: 6, border: "1px solid #bbf7d0" }}>{createUser.success}</p>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setCreateUser(null)} style={{ padding: "8px 20px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, cursor: "pointer", fontSize: 14, color: "#334155" }}>
                {createUser.success ? "Close" : "Cancel"}
              </button>
              {!createUser.success && (
                <button
                  onClick={submitCreateUser}
                  disabled={createUser.saving || !createUser.fullName || !createUser.email || !createUser.mobile || !createUser.password}
                  style={{ padding: "8px 20px", background: createUser.saving || !createUser.fullName || !createUser.email || !createUser.mobile || !createUser.password ? "#94a3b8" : "#2D1B69", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, color: "#fff", fontWeight: 600 }}
                >
                  {createUser.saving ? "Creating…" : "Create User"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editContact && (
        <div
          onClick={handleEditContactOverlayClick}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            ref={editContactModalRef}
            style={{ background: "#fff", borderRadius: 10, padding: "32px 28px", width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", position: "relative" }}
          >
            <button onClick={() => setEditContact(null)} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#666" }}>×</button>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Edit Contact</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#555" }}>User: <strong>{editContact.displayName}</strong></p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Email</label>
              <input
                type="email"
                value={editContact.email}
                onChange={(e) => setEditContact((s) => s && { ...s, email: e.target.value, error: "", success: "" })}
                placeholder="email@example.com"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Mobile (10 digits)</label>
              <input
                type="text"
                value={editContact.mobile}
                onChange={(e) => setEditContact((s) => s && { ...s, mobile: e.target.value, error: "", success: "" })}
                placeholder="10-digit mobile"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>

            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
              Freeing old email/mobile makes them immediately available for new registrations.
            </p>

            {editContact.error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12, background: "#fef2f2", padding: "8px 12px", borderRadius: 6, border: "1px solid #fecaca" }}>{editContact.error}</p>}
            {editContact.success && <p style={{ color: "#16a34a", fontSize: 13, marginBottom: 12, background: "#f0fdf4", padding: "8px 12px", borderRadius: 6, border: "1px solid #bbf7d0" }}>{editContact.success}</p>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setEditContact(null)} style={{ padding: "8px 20px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, cursor: "pointer", fontSize: 14, color: "#334155" }}>
                {editContact.success ? "Close" : "Cancel"}
              </button>
              {!editContact.success && (
                <button
                  onClick={submitEditContact}
                  disabled={editContact.saving}
                  style={{ padding: "8px 20px", background: editContact.saving ? "#94a3b8" : "#2D1B69", border: "none", borderRadius: 6, cursor: editContact.saving ? "not-allowed" : "pointer", fontSize: 14, color: "#fff", fontWeight: 600 }}
                >
                  {editContact.saving ? "Saving…" : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
