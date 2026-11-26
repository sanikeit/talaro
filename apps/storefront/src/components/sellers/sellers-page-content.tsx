import { SellerCard, SellerData } from "@/components/sellers/seller-card";
import { SellerFilterBar } from "@/components/sellers/seller-filter-bar";

interface SellersPageContentProps {
  searchParams: Promise<{ city?: string; pincode?: string }>;
}

export async function SellersPageContent({ searchParams }: SellersPageContentProps) {
  const resolvedParams = await searchParams;
  const city = resolvedParams?.city?.trim();
  const pincode = resolvedParams?.pincode?.trim();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
  const queryParams = new URLSearchParams({ limit: "50" });
  if (city) queryParams.set("city", city);
  if (pincode) queryParams.set("pincode", pincode);

  let sellers: SellerData[] = [];
  let fetchError: string | null = null;

  try {
    const res = await fetch(`${apiUrl}/public/sellers?${queryParams.toString()}`, {
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const data = await res.json();
      sellers = data.sellers || [];
    } else {
      fetchError = `Failed to load sellers (HTTP ${res.status})`;
    }
  } catch (err: any) {
    fetchError = err.message || "Network error loading sellers";
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Title & Subtitle */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Verified hardware suppliers near you
        </h1>
        <p className="text-base text-gray-600">
          Every seller is verified. Contact directly on WhatsApp.
        </p>
      </div>

      {/* Filter Bar */}
      <SellerFilterBar initialCity={city} initialPincode={pincode} />

      {/* Error state */}
      {fetchError && (
        <div className="p-4 mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {fetchError}
        </div>
      )}

      {/* Seller Grid or Empty State */}
      {!fetchError && sellers.length === 0 ? (
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {city
              ? `No verified sellers in ${city} yet.`
              : pincode
              ? `No verified sellers in pincode ${pincode} yet.`
              : "No verified sellers found yet."}
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            We&apos;re onboarding shops in your area — check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </div>
  );
}
