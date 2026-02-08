import { requireRole } from "@/lib/requireRole";

export default async function AdminPage() {
  const user = await requireRole(["ADMIN"]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Admin Panel (placeholder)</h1>
        <p className="text-gray-600">Logged in as {user.email} — Role: {user.role}</p>
      </div>
    </div>
  );
}
