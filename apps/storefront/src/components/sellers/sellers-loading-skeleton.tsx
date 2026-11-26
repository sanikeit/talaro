export default function SellersLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="h-9 w-80 bg-gray-200 animate-pulse rounded-md mb-2" />
        <div className="h-5 w-96 bg-gray-100 animate-pulse rounded-md" />
      </div>

      {/* Filter bar skeleton */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-8 h-20 animate-pulse" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-64 animate-pulse flex flex-col justify-between"
          >
            <div>
              <div className="flex gap-4 mb-4">
                <div className="w-14 h-14 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="h-4 w-full bg-gray-100 rounded mb-2" />
              <div className="h-4 w-2/3 bg-gray-100 rounded" />
            </div>
            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
              <div className="h-8 bg-gray-200 rounded-lg" />
              <div className="h-8 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
