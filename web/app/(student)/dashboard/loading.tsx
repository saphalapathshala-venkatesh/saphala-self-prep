export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top message */}
      <div className="bg-white border-b border-gray-100 py-3 px-4 text-center">
        <p className="text-xs text-[#6D4BCB] font-medium animate-pulse">Getting your progress ready…</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-xl mb-3" />
              <div className="h-6 bg-gray-200 rounded-lg w-12 mb-1.5" />
              <div className="h-3.5 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left - wide card */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-32" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="w-20 h-8 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>

          {/* Right - narrow card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-28 mx-auto" />
            <div className="h-3 bg-gray-100 rounded w-20 mx-auto" />
          </div>
        </div>

        {/* Bottom row */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-40" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
