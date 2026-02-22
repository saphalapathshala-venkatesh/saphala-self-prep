"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  mobile: string;
  role: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Record<string, { msg: string; ok: boolean }>>({});
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

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

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Admin — Users</h1>

      {loading && <p>Loading users…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
              <th style={{ padding: "8px 4px" }}>Email</th>
              <th style={{ padding: "8px 4px" }}>Mobile</th>
              <th style={{ padding: "8px 4px" }}>Role</th>
              <th style={{ padding: "8px 4px" }}>Joined</th>
              <th style={{ padding: "8px 4px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 4px" }}>{u.email}</td>
                <td style={{ padding: "8px 4px" }}>{u.mobile}</td>
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
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: "8px 4px" }}>
                  <button
                    onClick={() => saveRole(u.id)}
                    disabled={!pendingRoles[u.id] || pendingRoles[u.id] === u.role}
                    style={{
                      padding: "4px 12px",
                      cursor:
                        pendingRoles[u.id] && pendingRoles[u.id] !== u.role
                          ? "pointer"
                          : "not-allowed",
                      opacity:
                        pendingRoles[u.id] && pendingRoles[u.id] !== u.role ? 1 : 0.5,
                    }}
                  >
                    Save
                  </button>
                  {feedback[u.id] && (
                    <span
                      style={{
                        marginLeft: 8,
                        color: feedback[u.id].ok ? "green" : "red",
                        fontSize: 13,
                      }}
                    >
                      {feedback[u.id].msg}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && !error && users.length === 0 && <p>No users found.</p>}
    </div>
  );
}
