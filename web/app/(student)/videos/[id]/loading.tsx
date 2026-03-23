export default function VideoDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-40" />
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div style={{ paddingTop: "56.25%", position: "relative" }}>
          <div className="absolute inset-0 bg-gray-100" />
        </div>
        <div className="p-6 space-y-3">
          <div className="h-4 w-16 bg-gray-200 rounded-full" />
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
