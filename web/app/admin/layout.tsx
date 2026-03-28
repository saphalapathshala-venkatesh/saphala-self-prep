import { requireRole } from "@/lib/requireRole";
import AdminNav from "./AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["ADMIN"]);
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      {children}
    </div>
  );
}
