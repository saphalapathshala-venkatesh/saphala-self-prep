import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ROUTES } from "@/config/terminology";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

function maskMobile(mobile: string): string {
  if (mobile.length < 4) return "••••••••••";
  return mobile.slice(0, 2) + "••••••" + mobile.slice(-2);
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="py-3.5 border-b border-gray-50 last:border-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className={`text-sm font-medium ${value ? "text-gray-800" : "text-gray-300"}`}>
        {value || "—"}
      </p>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [attemptCount, xpAgg] = await Promise.all([
    prisma.attempt.count({ where: { userId: user.id, status: "SUBMITTED" } }),
    prisma.xpLedgerEntry.aggregate({ where: { userId: user.id }, _sum: { delta: true } }),
  ]);

  const xpTotal = xpAgg._sum.delta ?? 0;
  const displayName = user.fullName ?? user.email ?? user.mobile ?? "Student";
  const initials = (user.fullName ?? displayName)
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <div>
      {/* Page header */}
      <section className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href={ROUTES.dashboard}
            className="text-gray-400 hover:text-[#6D4BCB] transition-colors"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#2D1B69]">My Profile</h1>
            <p className="text-sm text-gray-500">Your account details</p>
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Avatar + name */}
        <div className="bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] rounded-2xl p-6 text-white flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">{displayName}</h2>
            <p className="text-purple-200 text-sm">Student · Saphala Pathshala</p>
            <p className="text-purple-300 text-xs mt-1">Joined {formatDate(user.createdAt)}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Tests Completed", value: String(attemptCount) },
            { label: "XP Earned", value: String(xpTotal) },
            { label: "Sadhana Streak", value: "0 days" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-xl font-bold text-[#2D1B69]">{stat.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Account details */}
        <div className="bg-white rounded-2xl border border-gray-100 px-5 divide-y divide-gray-50">
          <div className="py-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#2D1B69]">Account Details</h3>
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              Read-only · V1
            </span>
          </div>
          <Field label="Full Name" value={user.fullName} />
          <Field label="Email Address" value={user.email} />
          <Field
            label="Mobile Number"
            value={user.mobile ? `+91 ${maskMobile(user.mobile)}` : null}
          />
          <Field label="State" value={user.state} />
          <Field label="Gender" value={user.gender} />
          <Field label="Account Role" value={user.role} />
          <Field label="Member Since" value={formatDate(user.createdAt)} />
        </div>

        {/* Info note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
          <svg
            className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-blue-800 mb-0.5">Profile editing coming soon</p>
            <p className="text-xs text-blue-600 leading-relaxed">
              You can view your profile details here. Editing your name, state, and other fields
              will be available in a future update. For urgent changes, please contact support.
            </p>
          </div>
        </div>

        {/* Navigation shortcuts */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={ROUTES.attempts}
            className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100 transition-colors">
              <svg className="w-4 h-4 text-[#6D4BCB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#2D1B69]">My Attempts</p>
              <p className="text-[10px] text-gray-400">View test history</p>
            </div>
          </Link>
          <Link
            href={ROUTES.testHub}
            className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#2D1B69]">TestHub</p>
              <p className="text-[10px] text-gray-400">Practice tests</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
