export function SellerDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-28 md:pb-16 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Breadcrumb Skeleton */}
        <div className="h-4 w-36 bg-gray-200 rounded mb-4" />

        {/* Seller Profile Header Card Skeleton */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-8">
          {/* Banner Skeleton */}
          <div className="w-full h-44 sm:h-56 md:h-64 bg-gray-200" />

          {/* Profile Info Row Skeleton */}
          <div className="px-6 pb-6 pt-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-10 sm:-mt-12 mb-4">
              <div className="flex items-end gap-4">
                {/* Avatar Skeleton */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-md bg-gray-300 relative z-10 flex-shrink-0" />

                <div className="pt-2 space-y-2">
                  {/* Name and badge skeleton */}
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-48 bg-gray-300 rounded" />
                    <div className="h-5 w-20 bg-gray-200 rounded-full" />
                  </div>
                  {/* Location & date skeleton */}
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-28 bg-gray-200 rounded" />
                    <div className="h-4 w-36 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>

              {/* Action buttons skeleton (desktop) */}
              <div className="hidden md:flex items-center gap-2.5">
                <div className="h-10 w-44 bg-gray-200 rounded-xl" />
                <div className="h-10 w-24 bg-gray-200 rounded-xl" />
                <div className="h-10 w-24 bg-gray-200 rounded-xl" />
              </div>
            </div>

            {/* Description skeleton */}
            <div className="space-y-2 mt-4 max-w-2xl">
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
            </div>
          </div>
        </div>

        {/* Products Section Skeleton */}
        <div className="mb-12">
          <div className="h-7 w-64 bg-gray-200 rounded mb-6" />

          {/* 3 product card skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="w-full h-48 bg-gray-200" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-5 w-4/5 bg-gray-200 rounded" />
                    <div className="h-6 w-1/3 bg-gray-300 rounded" />
                    <div className="h-4 w-1/2 bg-gray-100 rounded" />
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
      </div>
    </div>
  );
}
