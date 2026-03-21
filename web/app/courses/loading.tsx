export default function CoursesLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Category tabs skeleton */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-3 overflow-x-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="shrink-0 h-9 w-24 bg-gray-100 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Filter pills skeleton */}
        <div className="flex gap-2 flex-wrap">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-28 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>

        {/* Course cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-100" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="flex gap-2 pt-1">
                  <div className="h-6 w-16 bg-gray-100 rounded-full" />
                  <div className="h-6 w-20 bg-gray-100 rounded-full" />
                </div>
                <div className="h-9 bg-gray-100 rounded-xl w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
