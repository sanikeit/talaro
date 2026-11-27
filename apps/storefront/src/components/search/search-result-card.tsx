import Image from "next/image";
import Link from "next/link";
import { buildProductEnquiryLink } from "@/lib/whatsapp";
import { HoldButton } from "@/components/hold/hold-button";

export interface SearchProduct {
  id: string;
  title: string;
  thumbnail: string | null;
  description: string | null;
  is_held?: boolean;
  seller: {
    id: string;
    handle: string;
    name: string;
    city: string | null;
    phone: string | null;
    whatsapp_phone: string | null;
  };
  offers: Array<{
    id: string;
    price: number;
    currency: string;
    stock_status: string;
    is_held?: boolean;
  }>;
}

interface SearchResultCardProps {
  product: SearchProduct;
}

export function SearchResultCard({ product }: SearchResultCardProps) {
  const seller = product.seller;
  const phone = seller.whatsapp_phone || seller.phone;
  const enquiryUrl = phone
    ? buildProductEnquiryLink(phone, product.title, seller.name)
    : null;

  // Format Price in INR
  const prices = (product.offers || [])
    .map((o) => o.price)
    .filter((p) => typeof p === "number" && !isNaN(p));

  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  let priceDisplay: string;
  if (prices.length > 0) {
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) {
      priceDisplay = `₹${minPrice.toLocaleString("en-IN")}`;
    } else {
      priceDisplay = `₹${minPrice.toLocaleString("en-IN")} – ₹${maxPrice.toLocaleString("en-IN")}`;
    }
  } else {
    priceDisplay = "Price on request";
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        {/* Product Image */}
        <div className="w-full h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform hover:scale-105 duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 p-4 text-center">
              <svg
                className="w-12 h-12 mb-2 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-xs">No image preview</span>
            </div>
          )}
          {product.is_held && (
            <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-amber-100/95 text-amber-800 text-[11px] font-bold rounded-md border border-amber-300 shadow-xs backdrop-blur-xs">
              On Hold (24h)
            </span>
          )}
        </div>

        {/* Product & Seller Details */}
        <div className="p-4 pb-2">
          {/* Plain text title per TASK 2 decision — NO link to /products/[handle] */}
          <h3
            className="text-sm md:text-base font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem]"
            title={product.title}
          >
            {product.title}
          </h3>

          {/* Pricing */}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
              {priceDisplay}
            </span>
          </div>

          {/* Seller Section Prominent */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 gap-2">
            <Link
              href={`/s/${seller.handle}`}
              className="font-medium text-gray-900 hover:text-blue-600 truncate max-w-[60%]"
              title={seller.name}
            >
              {seller.name}
            </Link>
            <div className="flex items-center gap-1 text-gray-500 truncate flex-shrink-0">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 text-gray-400"
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
              <span className="truncate">{seller.city || "Location unlisted"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: 2-col grid */}
      <div className="p-4 pt-2 border-t border-gray-100 flex flex-col gap-2 mt-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Enquire on WhatsApp CTA */}
          {enquiryUrl ? (
            <a
              href={enquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>Enquire on WhatsApp</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="No phone provided"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg cursor-not-allowed"
            >
              <span>Enquire on WhatsApp</span>
            </button>
          )}

          {/* 24h hold CTA */}
          <HoldButton
            offerId={product.offers?.[0]?.id || product.id}
            productTitle={product.title}
            productThumbnail={product.thumbnail}
            price={minPrice}
            sellerName={seller.name}
            sellerCity={seller.city}
            isHeld={product.is_held}
          />
        </div>
      </div>
    </div>
  );
}
