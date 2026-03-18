export default function TestBriefLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-4">
        {/* Context message */}
        <p className="text-center text-sm text-[#6D4BCB] font-medium animate-pulse">
          Preparing your test environment…
        </p>

        {/* Card skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
          <div className="h-2 bg-gradient-to-r from-[#6D4BCB] to-[#2D1B69]" />
          <div className="p-6 space-y-4">
            <div className="h-3 bg-gray-200 rounded w-16" />
            <div className="h-7 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-full" />

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 py-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="h-5 bg-gray-200 rounded w-10 mx-auto mb-1.5" />
                  <div className="h-3 bg-gray-100 rounded w-16 mx-auto" />
                </div>
              ))}
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-1 h-1 bg-gray-300 rounded-full mt-1.5 flex-shrink-0" />
                  <div className="h-3.5 bg-gray-100 rounded flex-1" style={{ width: `${70 + Math.random() * 30}%` }} />
                </div>
              ))}
            </div>

            {/* Button placeholder */}
            <div className="h-12 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
