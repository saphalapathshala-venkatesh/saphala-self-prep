export default function ResultLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Context message */}
      <div className="bg-white border-b border-gray-100 py-3 px-4 text-center">
        <p className="text-xs text-[#6D4BCB] font-medium animate-pulse">Analyzing your performance…</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Score card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-200" />
            <div className="h-7 bg-gray-200 rounded w-40" />
            <div className="h-4 bg-gray-100 rounded w-28" />
            <div className="flex gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="h-6 bg-gray-200 rounded w-12 mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-36" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                <div className="h-2.5 bg-gray-100 rounded w-full">
                  <div className="h-full bg-gray-200 rounded" style={{ width: `${30 + i * 15}%` }} />
                </div>
              </div>
              <div className="h-4 bg-gray-100 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
