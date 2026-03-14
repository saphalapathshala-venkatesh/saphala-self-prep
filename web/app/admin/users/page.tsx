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
  const modalRef = useRef<HTMLDivElement>(null);

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

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Admin — Users</h1>

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
    </div>
  );
}
