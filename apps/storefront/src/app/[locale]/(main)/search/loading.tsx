export default function SearchLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-pulse">
      {/* Search Bar Skeleton */}
      <div className="w-full h-16 bg-white border border-gray-200 rounded-2xl mb-8" />

      {/* Results Count Skeleton */}
      <div className="h-5 w-48 bg-gray-200 rounded mb-6" />

      {/* 6 Card Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-full h-48 bg-gray-200" />
              <div className="p-4 space-y-2.5">
                <div className="h-5 w-4/5 bg-gray-200 rounded" />
                <div className="h-6 w-1/3 bg-gray-300 rounded" />
                <div className="pt-2 border-t border-gray-100 flex justify-between">
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
            <div className="p-4 pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 mt-2">
              <div className="h-8 bg-gray-200 rounded-lg" />
              <div className="h-8 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
