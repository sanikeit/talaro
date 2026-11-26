import Link from "next/link";
import { SearchBar } from "./search-bar";
import { SearchResultCard, SearchProduct } from "./search-result-card";

interface SearchPageContentProps {
  searchParams: Promise<{
    q?: string;
    city?: string;
    pincode?: string;
    limit?: string;
    offset?: string;
  }>;
}

export async function SearchPageContent({
  searchParams,
}: SearchPageContentProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams?.q?.trim() || "";
  const city = resolvedParams?.city?.trim() || "";
  const pincode = resolvedParams?.pincode?.trim() || "";
  const limit = resolvedParams?.limit ? parseInt(resolvedParams.limit, 10) : 20;
  const offset = resolvedParams?.offset ? parseInt(resolvedParams.offset, 10) : 0;

  // TASK 6: If q is empty or missing -> render browse view without fetching
  if (!q) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <SearchBar initialQuery="" initialCity={city} initialPincode={pincode} />

        <div className="text-center py-20 px-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl my-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Search across all verified sellers
          </h1>
          <p className="text-base text-gray-600 mb-8 max-w-md mx-auto">
            Type a product name to search.
          </p>
          <Link
            href="/sellers"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Browse all sellers
          </Link>
        </div>
      </div>
    );
  }

  // Fetch products from public API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
  const url = new URL(`${apiUrl}/public/products`);
  url.searchParams.set("q", q);
  if (city) url.searchParams.set("city", city);
  if (pincode) url.searchParams.set("pincode", pincode);
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("offset", offset.toString());

  let products: SearchProduct[] = [];
  let totalCount = 0;
  let fetchError: string | null = null;

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const data = await res.json();
      products = data.products || [];
      totalCount = typeof data.count === "number" ? data.count : products.length;
    } else {
      fetchError = `Failed to load search results (HTTP ${res.status})`;
    }
  } catch (err: any) {
    fetchError = err.message || "Network error loading search results";
  }

  // Build filter pills URL targets
  const removeCityUrl = `/search?q=${encodeURIComponent(q)}${
    pincode ? `&pincode=${encodeURIComponent(pincode)}` : ""
  }`;
  const removePincodeUrl = `/search?q=${encodeURIComponent(q)}${
    city ? `&city=${encodeURIComponent(city)}` : ""
  }`;
  const clearAllUrl = `/search?q=${encodeURIComponent(q)}`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Search Bar */}
      <SearchBar initialQuery={q} initialCity={city} initialPincode={pincode} />

      {/* Active Filter Pills */}
      {(city || pincode) && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-medium text-gray-500 mr-1">Active filters:</span>
          {city && (
            <Link
              href={removeCityUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 transition-colors"
              title="Remove city filter"
            >
              <span>City: {city}</span>
              <span className="font-bold text-sm leading-none">&times;</span>
            </Link>
          )}
          {pincode && (
            <Link
              href={removePincodeUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 transition-colors"
              title="Remove pincode filter"
            >
              <span>Pincode: {pincode}</span>
              <span className="font-bold text-sm leading-none">&times;</span>
            </Link>
          )}
          <Link
            href={clearAllUrl}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 underline ml-2 transition-colors"
          >
            Clear all filters
          </Link>
        </div>
      )}

      {/* Error state */}
      {fetchError && (
        <div className="p-4 mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {fetchError}
        </div>
      )}

      {/* Results Count & Grid or Empty State */}
      {!fetchError && products.length === 0 ? (
        <div className="text-center py-16 px-4 bg-gray-50 border border-dashed border-gray-300 rounded-2xl my-8">
          <div className="w-16 h-16 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No results for &apos;{q}&apos;{city ? ` in ${city}` : ""}.
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Try a broader term or a different city.
          </p>
          <Link
            href="/sellers"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Browse all sellers
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-600">
              {totalCount} {totalCount === 1 ? "result" : "results"} from verified sellers
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <SearchResultCard
                key={`${product.id}-${product.seller.id}`}
                product={product}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
