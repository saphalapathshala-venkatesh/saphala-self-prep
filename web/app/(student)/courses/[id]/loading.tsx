export default function CourseDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Context message */}
      <div className="bg-white border-b border-gray-100 py-3 px-4 text-center">
        <p className="text-xs text-[#6D4BCB] font-medium animate-pulse">Opening your course…</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Course header skeleton */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
          <div className="h-40 bg-gradient-to-r from-gray-200 to-gray-100" />
          <div className="p-6 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
            <div className="flex gap-2 mt-4">
              <div className="h-7 bg-gray-100 rounded-full w-20" />
              <div className="h-7 bg-gray-100 rounded-full w-24" />
              <div className="h-7 bg-gray-100 rounded-full w-16" />
            </div>
          </div>
        </div>

        {/* Curriculum skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 animate-pulse overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
                <div className="w-5 h-5 bg-gray-100 rounded" />
              </div>
              {i === 0 && (
                <div className="pl-16 pr-5 pb-4 space-y-2.5">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-100 rounded flex-shrink-0" />
                      <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
