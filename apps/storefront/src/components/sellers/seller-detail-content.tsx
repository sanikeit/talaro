import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { ProductCard, ProductItem } from "@/components/sellers/product-card";
import { SellerShareButton } from "@/components/sellers/seller-share-button";

export interface SellerDetail {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  city: string | null;
  pincode: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  delivery_available?: boolean;
  verification_tier?: string;
  created_at?: string;
}

interface SellerDetailContentProps {
  handle: string;
  initialData?: any;
  backHref?: string;
}

export async function SellerDetailContent({
  handle,
  initialData,
  backHref = "/sellers",
}: SellerDetailContentProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

  let status = 200;
  let data: any = initialData || null;

  if (!data) {
    try {
      const res = await fetch(`${apiUrl}/public/sellers/${handle}`, {
        next: { revalidate: 30 },
      });
      status = res.status;
      if (res.ok) {
        data = await res.json();
      }
    } catch (error: any) {
      console.error(`Error loading seller ${handle}:`, error);
      status = 500;
    }
  }

  if (status === 404 || !data?.seller) {
    notFound();
  }

  const seller: SellerDetail = data.seller;
  const products: ProductItem[] = data.products || [];

  // Phone & WhatsApp link
  const phone = seller.whatsapp_phone || seller.phone;
  const whatsappUrl = phone ? buildWhatsAppLink(phone) : null;

  // Verification Badge styling
  const tier = (seller.verification_tier || "LISTED").toUpperCase();
  let badgeStyle = "bg-gray-100 text-gray-700 border-gray-300";
  let badgeLabel = "LISTED";

  if (tier === "VERIFIED") {
    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-300";
    badgeLabel = "VERIFIED";
  } else if (tier === "INCOMPLETE" || tier === "STALE") {
    badgeStyle = "bg-amber-50 text-amber-700 border-amber-300";
    badgeLabel = tier;
  }

  // Initials Avatar
  const initials = seller.name
    ? seller.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "S";

  // Formatted Member Since Date
  const memberSince = seller.created_at
    ? new Date(seller.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="min-h-screen bg-gray-50 pb-28 md:pb-16">
      {/* Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TASK 4: Navigation breadcrumb */}
        <div className="mb-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-gray-400 group-hover:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back to all sellers</span>
          </Link>
        </div>

        {/* Seller Profile Header Card */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-8">
          {/* Banner */}
          <div className="w-full h-44 sm:h-56 md:h-64 relative bg-gray-100 overflow-hidden">
            {seller.banner ? (
              <Image
                src={seller.banner}
                alt={`${seller.name} banner`}
                fill
                priority
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 flex items-center justify-center">
                <span className="text-white/20 font-black text-4xl sm:text-6xl tracking-widest uppercase select-none">
                  {seller.name.slice(0, 3)}
                </span>
              </div>
            )}
          </div>

          {/* Profile Info Row */}
          <div className="px-6 pb-6 pt-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-10 sm:-mt-12 mb-4">
              {/* Logo / Initials Avatar */}
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-white relative z-10 flex-shrink-0 flex items-center justify-center">
                  {seller.logo ? (
                    <Image
                      src={seller.logo}
                      alt={seller.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 font-bold text-2xl sm:text-3xl flex items-center justify-center">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                      {seller.name}
                    </h1>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeStyle}`}
                    >
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Location & Member since */}
                  <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-500 mt-1.5 flex-wrap">
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>
                        {seller.city ? seller.city : "Location unlisted"}
                        {seller.pincode ? ` - ${seller.pincode}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Member since {memberSince}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Action Bar (Inline) */}
              <div className="hidden md:flex items-center gap-2.5">
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                    <span>Chat on WhatsApp</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="No phone provided"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-not-allowed"
                  >
                    <span>Chat on WhatsApp</span>
                  </button>
                )}

                {seller.phone ? (
                  <a
                    href={`tel:${seller.phone}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Call</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="No phone provided"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-300 text-sm font-semibold rounded-xl cursor-not-allowed"
                  >
                    <span>Call</span>
                  </button>
                )}

                <SellerShareButton sellerName={seller.name} handle={seller.handle} />
              </div>
            </div>

            {/* Seller Description if present */}
            {seller.description && (
              <p className="text-sm sm:text-base text-gray-600 max-w-4xl mt-3 leading-relaxed">
                {seller.description}
              </p>
            )}
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Products from {seller.name} ({products.length})
            </h2>
          </div>

          {products.length === 0 ? (
            /* Empty state when 0 products listed */
            <div className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products listed yet</h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                This seller hasn&apos;t listed any products yet. Contact them on WhatsApp to ask what&apos;s in stock.
              </p>
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>Ask what&apos;s in stock on WhatsApp</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="No phone provided"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-400 font-medium text-sm rounded-xl cursor-not-allowed"
                >
                  <span>Ask what&apos;s in stock on WhatsApp</span>
                </button>
              )}
            </div>
          ) : (
            /* Responsive grid: 1 col on mobile, 2 on tablet, 3 on desktop */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  seller={{
                    name: seller.name,
                    phone: seller.phone,
                    whatsapp_phone: seller.whatsapp_phone,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 px-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] flex items-center gap-2">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>WhatsApp</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="No phone provided"
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-not-allowed"
          >
            <span>WhatsApp</span>
          </button>
        )}

        {seller.phone ? (
          <a
            href={`tel:${seller.phone}`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Call</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="No phone provided"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-300 text-sm font-semibold rounded-xl cursor-not-allowed"
          >
            <span>Call</span>
          </button>
        )}

        <SellerShareButton sellerName={seller.name} handle={seller.handle} compact />
      </div>
    </div>
  );
}
